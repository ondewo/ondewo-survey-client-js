// Copyright 2021-2026 ONDEWO GmbH
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

// D18 headless-SDK auth helper (keycloak-migration-plan §7.8 + D18).
//
// One-time ROPC login (grant_type=password, scope=offline_access) against the PUBLIC SDK client
// `ondewo-survey-cai-sdk-public` (no client_secret -- Q1), then a bounded background loop that refreshes
// the short-lived access token from the offline refresh token before it expires. The current access
// token is exposed for an `Authorization: Bearer <token>` gRPC metadata header. The refresh loop stops
// after `tokenExpirationInS` (if given) has elapsed since login.

'use strict';

/* global URLSearchParams, setTimeout, clearTimeout, module */

/**
 * The form-encoded parameter map sent in a token-endpoint request body. Every value is a string
 * because it is serialized through {@link URLSearchParams}.
 *
 * @typedef {Record<string, string>} TokenRequestParams
 */

/**
 * The minimal slice of a `fetch` {@link Response} this module relies on. The injectable `fetchImpl`
 * only needs to expose the status, an `ok` flag, and a `text()` body reader.
 *
 * @typedef {object} FetchResponse
 * @property {boolean} ok
 *     Whether the HTTP status is in the 2xx range.
 * @property {number} status
 *     The numeric HTTP status code.
 * @property {() => Promise<string>} text
 *     Resolves to the raw response body as text.
 */

/**
 * The `fetch`-compatible function injected for testability. Defaults to `globalThis.fetch`.
 *
 * @typedef {(url: string, init: object) => Promise<FetchResponse>} FetchImpl
 */

/**
 * The subset of a Keycloak OIDC token-endpoint JSON response this module consumes. Keycloak returns
 * more fields; only these are read.
 *
 * @typedef {object} TokenResponse
 * @property {string} access_token
 *     The short-lived bearer access token.
 * @property {string} [refresh_token]
 *     The (offline) refresh token; absent unless the request carried the `offline_access` scope and
 *     the client allows direct-access grants. Keycloak may rotate it on each refresh.
 * @property {number} [expires_in]
 *     The access token's lifetime in seconds; used to schedule the next refresh.
 */

/**
 * Construction options for {@link OfflineTokenProvider} (the credential-free subset of {@link LoginOptions}).
 *
 * @typedef {object} ProviderOptions
 * @property {string} keycloakUrl
 *     Base Keycloak URL, optionally ending in `/auth` and/or a trailing slash.
 * @property {string} realm
 *     The Keycloak realm whose token endpoint is targeted.
 * @property {string} clientId
 *     The PUBLIC SDK client id (no client secret) used for the ROPC + refresh grants.
 * @property {number} [tokenExpirationInS]
 *     Optional upper bound, in seconds since login, after which the auto-refresh loop stops.
 * @property {FetchImpl} [fetchImpl]
 *     Optional `fetch` override for testing; defaults to `globalThis.fetch`.
 * @property {() => number} [nowInMs]
 *     Optional monotonic clock override returning milliseconds; defaults to `Date.now`.
 */

/**
 * The full options object accepted by {@link login}: {@link ProviderOptions} plus the ROPC credentials.
 *
 * @typedef {ProviderOptions & { username: string, password: string }} LoginOptions
 */

// Seconds of head-room subtracted from a token's `expires_in` so the refresh fires before the access
// token actually lapses (covers clock skew + the round-trip to Keycloak).
const REFRESH_SKEW_IN_S = 30;

// Lower bound for the scheduled refresh delay so a tiny/zero `expires_in` cannot spin a hot loop.
const MIN_REFRESH_DELAY_IN_S = 1;

/** Error raised on any token-endpoint or token-shape failure. */
class TokenError extends Error {
	/**
	 * @param {string} message
	 *     A human-readable description of the token failure.
	 */
	constructor(message) {
		super(message);
		this.name = 'TokenError';
	}
}

/**
 * Build the OIDC token endpoint URL for a realm, tolerating a trailing slash on `keycloakUrl` and an
 * optional `/auth` relative path already baked into it.
 *
 * @param {string} keycloakUrl
 *     Base Keycloak URL (may end in `/auth` and/or one or more trailing slashes).
 * @param {string} realm
 *     The realm name; URL-encoded into the endpoint path.
 * @returns {string}
 *     The fully-qualified `…/realms/<realm>/protocol/openid-connect/token` URL.
 */
function buildTokenEndpoint(keycloakUrl, realm) {
	const base = keycloakUrl.replace(/\/+$/, '');
	return `${base}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`;
}

/**
 * POST an `application/x-www-form-urlencoded` body to the token endpoint and return the parsed JSON.
 * Raises TokenError on a non-2xx response or unparseable / access_token-less body.
 *
 * @param {string} tokenEndpoint
 *     The realm token endpoint URL built by {@link buildTokenEndpoint}.
 * @param {TokenRequestParams} params
 *     The grant parameters to form-encode into the request body.
 * @param {FetchImpl} fetchImpl
 *     The `fetch`-compatible implementation to perform the request with.
 * @returns {Promise<TokenResponse>}
 *     The parsed token response (guaranteed to carry a non-empty `access_token`).
 * @throws {TokenError}
 *     On a non-2xx response, a non-JSON body, or a body missing `access_token`.
 */
async function postTokenRequest(tokenEndpoint, params, fetchImpl) {
	const body = new URLSearchParams(params).toString();
	const response = await fetchImpl(tokenEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body
	});
	const text = await response.text();
	if (!response.ok) {
		throw new TokenError(`Keycloak token endpoint returned HTTP ${response.status}: ${text}`);
	}
	/** @type {TokenResponse} */
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new TokenError(`Keycloak token endpoint returned a non-JSON body: ${text}`);
	}
	if (typeof parsed.access_token !== 'string' || parsed.access_token.length === 0) {
		throw new TokenError('Keycloak token response did not contain an access_token');
	}
	return parsed;
}

/**
 * A live access-token holder backed by a bounded auto-refresh loop. Obtain one from {@link login};
 * read {@link OfflineTokenProvider#getAuthorizationHeader} for the gRPC `Authorization` metadata and
 * call {@link OfflineTokenProvider#stop} when done.
 */
class OfflineTokenProvider {
	/**
	 * @param {ProviderOptions} options
	 *     The credential-free construction options. {@link login} forwards its full {@link LoginOptions}
	 *     here; the extra `username`/`password` fields are simply ignored by the constructor.
	 */
	constructor(options) {
		/** @type {string} The realm token endpoint used for both the ROPC and refresh grants. */
		this.tokenEndpoint = buildTokenEndpoint(options.keycloakUrl, options.realm);
		/** @type {string} The PUBLIC SDK client id sent on every grant. */
		this.clientId = options.clientId;
		/** @type {number | undefined} Optional bound (seconds since login) after which refreshing stops. */
		this.tokenExpirationInS = options.tokenExpirationInS;
		/** @type {FetchImpl} The `fetch` implementation; the injected override or `globalThis.fetch`. */
		this.fetchImpl = options.fetchImpl !== undefined ? options.fetchImpl : globalThis.fetch;
		/** @type {() => number} Monotonic millisecond clock; the injected override or `Date.now`. */
		this.nowInMs = options.nowInMs !== undefined ? options.nowInMs : Date.now;
		/** @type {string | null} The current access token, or null before bootstrap / after lapse. */
		this.accessToken = null;
		/** @type {string | null} The newest offline refresh token, or null before bootstrap. */
		this.refreshToken = null;
		/** @type {ReturnType<typeof setTimeout> | null} The armed refresh timer, or null when none is pending. */
		this.timer = null;
		/** @type {boolean} Set once {@link OfflineTokenProvider#stop} runs; gates all further refreshing. */
		this.stopped = false;
		/** @type {number | null} Absolute wall-clock deadline (ms) for the loop, or null when unbounded. */
		this.deadlineInMs = null;
		/** @type {((error: unknown) => void) | null} Optional callback for background-refresh failures. */
		this.onRefreshErrorHandler = null;
	}

	/**
	 * Perform the one-time ROPC login and arm the first refresh. Awaited by {@link login}.
	 *
	 * @param {string} username
	 *     The resource-owner (tech user) username for the ROPC grant.
	 * @param {string} password
	 *     The resource-owner password for the ROPC grant.
	 * @returns {Promise<void>}
	 *     Resolves once the first token pair is stored and the first refresh is armed.
	 * @throws {TokenError}
	 *     If the login fails or the response carries no `refresh_token` (offline_access missing).
	 */
	async bootstrap(username, password) {
		const tokenResponse = await postTokenRequest(
			this.tokenEndpoint,
			{
				grant_type: 'password',
				client_id: this.clientId,
				username,
				password,
				scope: 'offline_access'
			},
			this.fetchImpl
		);
		this.accessToken = tokenResponse.access_token;
		this.refreshToken = typeof tokenResponse.refresh_token === 'string' ? tokenResponse.refresh_token : null;
		if (this.refreshToken === null) {
			throw new TokenError(
				'Keycloak token response did not contain a refresh_token; the SDK client must have ' +
					'directAccessGrants + the offline_access scope (ondewo-survey-cai-sdk-public)'
			);
		}
		if (this.tokenExpirationInS !== undefined) {
			const expirationInMs = this.tokenExpirationInS * 1000;
			this.deadlineInMs = this.nowInMs() + expirationInMs;
		}
		this.scheduleRefresh(tokenResponse.expires_in);
	}

	/**
	 * Exchange the offline refresh token for a fresh access token and re-arm the next refresh. Returns
	 * early without any network call if the provider was stopped or its bounded deadline has elapsed.
	 *
	 * @returns {Promise<void>}
	 *     Resolves once the token is refreshed and the next refresh is armed (or the loop has stopped).
	 * @throws {TokenError}
	 *     If the refresh grant fails or returns an invalid body (propagated to the timer's catch handler).
	 */
	async refresh() {
		if (this.stopped) {
			return;
		}
		// Re-check the bounded deadline at fire time (not just at schedule time): once it has elapsed the
		// loop stops with no further renewal -> the access token lapses -> re-login is required.
		if (this.deadlineInMs !== null && this.nowInMs() >= this.deadlineInMs) {
			this.stop();
			return;
		}
		const tokenResponse = await postTokenRequest(
			this.tokenEndpoint,
			{
				grant_type: 'refresh_token',
				client_id: this.clientId,
				refresh_token: this.refreshToken
			},
			this.fetchImpl
		);
		this.accessToken = tokenResponse.access_token;
		// Keycloak may rotate the offline refresh token; keep the newest one when present.
		if (typeof tokenResponse.refresh_token === 'string' && tokenResponse.refresh_token.length > 0) {
			this.refreshToken = tokenResponse.refresh_token;
		}
		this.scheduleRefresh(tokenResponse.expires_in);
	}

	/**
	 * Arm a single timer for the next refresh, clamped to the bounded deadline. Stops silently once
	 * `tokenExpirationInS` has elapsed (no further renewal -> access lapses -> re-login required).
	 *
	 * @param {number | undefined} expiresInRaw
	 *     The just-received `expires_in` (seconds); a missing or non-positive value falls back to
	 *     {@link MIN_REFRESH_DELAY_IN_S}.
	 * @returns {void}
	 */
	scheduleRefresh(expiresInRaw) {
		if (this.stopped) {
			return;
		}
		const expiresInS = typeof expiresInRaw === 'number' && expiresInRaw > 0 ? expiresInRaw : MIN_REFRESH_DELAY_IN_S;
		let delayInS = Math.max(expiresInS - REFRESH_SKEW_IN_S, MIN_REFRESH_DELAY_IN_S);
		if (this.deadlineInMs !== null) {
			const remainingInMs = this.deadlineInMs - this.nowInMs();
			if (remainingInMs <= 0) {
				this.stop();
				return;
			}
			delayInS = Math.min(delayInS, remainingInMs / 1000);
		}
		this.timer = setTimeout(() => {
			this.refresh().catch((refreshError) => {
				// Swallow a transient refresh failure but surface it so the caller can react; the next
				// gRPC call gets the stale (possibly expired) token and re-logs in on UNAUTHENTICATED.
				if (this.onRefreshErrorHandler !== null) {
					this.onRefreshErrorHandler(refreshError);
				}
			});
		}, delayInS * 1000);
		// Do not keep the event loop alive solely for the refresh timer.
		// c8 ignore next -- defensive: Node's real setTimeout always returns a Timeout exposing unref(); the
		// non-function branch is unreachable here and only guards against exotic non-Node shims.
		if (typeof this.timer.unref === 'function') {
			this.timer.unref();
		}
	}

	/**
	 * Register a callback invoked with the error of a failed background refresh (optional diagnostics).
	 *
	 * @param {(error: unknown) => void} handler
	 *     Invoked with the rejection of a failed background refresh. The most recent registration wins.
	 * @returns {void}
	 */
	onRefreshError(handler) {
		this.onRefreshErrorHandler = handler;
	}

	/**
	 * The current access token, or null before bootstrap / after the bounded loop has lapsed.
	 *
	 * @returns {string | null}
	 *     The live access token, or null when none is currently available.
	 */
	getAccessToken() {
		return this.accessToken;
	}

	/**
	 * The value for an `Authorization` gRPC metadata header: `Bearer <access_token>`.
	 *
	 * @returns {string}
	 *     The `Bearer <access_token>` header value.
	 * @throws {TokenError}
	 *     If no access token is available (login has not completed or the loop has lapsed).
	 */
	getAuthorizationHeader() {
		if (this.accessToken === null) {
			throw new TokenError('No access token available; login() has not completed or has lapsed');
		}
		return `Bearer ${this.accessToken}`;
	}

	/**
	 * Stop the auto-refresh loop. Idempotent; safe to call from any state.
	 *
	 * @returns {void}
	 */
	stop() {
		this.stopped = true;
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}

/**
 * One-time ROPC + offline_access login against the PUBLIC SDK client, returning a live token provider
 * whose access token is auto-refreshed in the background until `tokenExpirationInS` elapses.
 *
 * @param {LoginOptions} options
 *     The Keycloak connection settings plus the ROPC credentials (see {@link LoginOptions}).
 * @returns {Promise<OfflineTokenProvider>}
 *     A live provider whose access token is already populated and auto-refreshing.
 * @throws {TokenError}
 *     If `options` is missing, a required string option is empty, or the login request fails.
 */
async function login(options) {
	if (options === undefined || options === null) {
		throw new TokenError('login() requires an options object');
	}
	const requiredKeys = ['keycloakUrl', 'realm', 'clientId', 'username', 'password'];
	for (const key of requiredKeys) {
		const value = options[key];
		if (typeof value !== 'string' || value.length === 0) {
			throw new TokenError(`login() option "${key}" is required and must be a non-empty string`);
		}
	}
	const provider = new OfflineTokenProvider(options);
	await provider.bootstrap(options.username, options.password);
	return provider;
}

module.exports = { TokenError, OfflineTokenProvider, login };
