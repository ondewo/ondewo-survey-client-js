# Release History

*****************

## Release ONDEWO Survey Js Client 2.1.1

### New Features

* [[OND236-120]](https://ondewo.atlassian.net/browse/OND236-120) Offline-token start-up: the new `refreshToken` option hands the provider a Keycloak *offline* refresh token instead of a password. Start-up is one `grant_type=refresh_token` exchange and the provider never sends a password grant, not even as a fallback when the token is refused. A Keycloak configuration needs `password` OR `refreshToken`; when both are set the token wins.
* [[OND236-120]](https://ondewo.atlassian.net/browse/OND236-120) `getKeycloakTokenProvider()` shares one provider per credential set, keyed by a SHA-256 of the credentials and held weakly; only an explicit `stop()` / `clearKeycloakTokenProviders()` keeps it from being handed out again. `createAuthUnaryInterceptor()` attaches `authorization: Bearer <token>` to every unary gRPC-web call; `redactLoginOptions()` and `close()` are new.
* [[OND236-120]](https://ondewo.atlassian.net/browse/OND236-120) Tests: the cross-SDK Keycloak test catalogue (T01-T62) plus edge cases in `auth/offlineTokenProvider.spec.js`, at 100 % coverage. The README documents both start-up paths.

### Bug Fixes

* [[OND236-120]](https://ondewo.atlassian.net/browse/OND236-120) Keycloak token refresh: a failed refresh no longer ends the refresh. Every failure kind (a 5xx from a proxy, a DNS or connection failure, a restarting Keycloak, a dead offline session) is retried with full-jitter exponential backoff, 5 s doubling up to 300 s and measured from the moment the failure was recorded; the background loop and the new lazy `getAuthorizationMetadata()` share that backoff, and no request is sent before it elapses. A success resets the backoff.
* [[OND236-120]](https://ondewo.atlassian.net/browse/OND236-120) A token that is still valid keeps being served when its refresh fails inside the 30 s expiry leeway; only an EXPIRED token raises, and it raises `KeycloakAuthenticationError` (a `TokenError` subclass) whatever failed underneath (transport error, non-2xx status, a body that is not JSON or not a JSON object, a missing `access_token`, a non-numeric `expires_in`), with the original error kept as its cause. A malformed response changes no provider state. Concurrent callers share one in-flight refresh, so an outage costs one token request, not one per call.
* [[OND236-120]](https://ondewo.atlassian.net/browse/OND236-120) A token response without an `access_token` is reported by its field names only, never by its values (a token response is credential material), and a quoted Keycloak error body is cut at 500 characters.
* [[OND236-120]](https://ondewo.atlassian.net/browse/OND236-120) A password login whose response carries no `refresh_token` is accepted and the previous (empty) refresh token is kept, as in python, and the field names of a response without an `access_token` are quoted as python quotes them (`['expires_in', 'refresh_token']`).
* [[OND236-120]](https://ondewo.atlassian.net/browse/OND236-120) Only real transport failures (an abort or timeout, an error carrying a network `code`, the Node and browser network TypeErrors) are reported as "could not reach the token endpoint"; any other error reads `Keycloak token <action> failed (<type>: <message>)`, with the cause kept.

### Improvements

* [[OND236-120]](https://ondewo.atlassian.net/browse/OND236-120) The same Keycloak behaviour as every ONDEWO SDK (the python SDKs are the reference, ondewo-survey-client-python 2.1.1 ships the same fixes): the token request is bounded by a 10 s timeout, durations use a monotonic clock, the `tokenExpirationInS` window is armed on both start-up paths, each failed refresh logs one WARNING with the attempt number, the retry delay and how long the current token stays valid, and the first success afterwards one INFO. No credential appears in any log line, error or rendering of the configuration.
* Tracking API Version [2.1.0](https://github.com/ondewo/ondewo-survey-api/releases/tag/2.1.0) ( [Documentation](https://ondewo.github.io/ondewo-survey-api/) ), generated with ondewo-proto-compiler 5.17.0: the generated code is unchanged from 2.1.0

*****************

## Release ONDEWO Survey Js Client 2.1.0

### Improvements

* Tracking API Version [2.1.0](https://github.com/ondewo/ondewo-survey-api/releases/tag/2.1.0) ( [Documentation](https://ondewo.github.io/ondewo-survey-api/) )
* Generated with ondewo-proto-compiler 5.17.0 (protoc 35.1). New runtime floors: `grpc-web` ^2.1.1 and `google-protobuf` ^4.0.3; grpc-web 2.1.1 limits a response to 4 MB by default (set `maxReceiveMessageSize` to receive more)

*****************

## Release ONDEWO Survey Js Client 2.0.2

### Improvements

* [[OND211-2443]](https://ondewo.atlassian.net/browse/OND211-2443) TLS: new `auth/grpcWebEndpoint.js`
  (`buildGrpcWebEndpoint`) builds the gRPC-web endpoint URL for the generated clients per the ONDEWO TLS contract:
  `https://` by default, plaintext `http://` only with `useSecureChannel: false`, which logs a `console.warn` naming
  `host:port`. A bare IPv6 host is bracketed (`::1` becomes `https://[::1]:8443`), a `[...]` host is kept as given, and
  a host carrying a scheme, a path or a port, a port outside 1..65535 or a non-boolean `useSecureChannel` is refused.
* [[OND211-2443]](https://ondewo.atlassian.net/browse/OND211-2443) `grpcCert`, `grpcClientCert` and `grpcClientKey`
  are refused with an error naming the option, never its value: a browser verifies the server against its own trust
  store and presents a client certificate only from its own certificate store, and a private key must never be shipped
  to a browser. Mutual TLS from a browser works with a client certificate installed in the browser / OS certificate
  store, or with the gRPC-web proxy (Envoy) terminating TLS and using mutual TLS upstream.
* [[OND211-2443]](https://ondewo.atlassian.net/browse/OND211-2443) `OfflineTokenProvider` gains `toJSON()` and a Node
  `util.inspect` hook that render the access and refresh tokens as `***REDACTED***` (a token not yet set stays `null`),
  so `JSON.stringify`, `console.log` and `util.inspect` of a provider never print a token.
* [[OND211-2443]](https://ondewo.atlassian.net/browse/OND211-2443) README: new section "TLS, mutual TLS and
  certificates" (modes, the Envoy mutual-TLS setup, why gRPC-web has no keepalive / backoff channel options, and the
  Node.js SDK for mutual TLS from code with PEM files).

### Build

* Regenerated with [ondewo-proto-compiler 5.15.2](https://github.com/ondewo/ondewo-proto-compiler/releases/tag/5.15.2)
  (previous release: 5.10.0) against the same ondewo-survey-api commit 2.0.1 was built from
  (`37d2f92`, branch `OND211-2418-add-keycloak-for-2-fa`). The bundle embeds the `google-protobuf` runtime,
  now pinned to `^4.0.2` (was `^3.21.4`), the line that provides `reader.readStringRequireUtf8()` which the 5.15
  compiler emits. `tests/bundleStringRoundTrip.spec.js` loads the shipped bundle and round-trips a multi-byte string,
  so a generator / runtime mismatch fails the build instead of shipping.

### Tests and release notes

* `auth/grpcWebEndpoint.spec.js` and new `auth/offlineTokenProvider.spec.js` cases cover the endpoint builder and the
  token redaction under the 100% coverage gate.
* `tests/releaseNotes.spec.js` pins the Makefile's release-notes slice, every heading's spelling, one `*****`
  separator per section and a non-empty slice for the released version.
* RELEASE.md: closed the 1.1.0 section with its separator and added the 0.6.0 section (a tag without a release) from
  the tag's git history.

*****************

## Release ONDEWO Survey Js Client 2.0.1

### Bug Fixes

* [[OND221-2830]](https://ondewo.atlassian.net/browse/OND221-2830) Regenerated with [ondewo-proto-compiler 5.13.0](https://github.com/ondewo/ondewo-proto-compiler/releases/tag/5.13.0).
* [[OND221-2830]](https://ondewo.atlassian.net/browse/OND221-2830) No change to how the auth helper is consumed: this package ships a webpack bundle rather than a public-api barrel, and the auth helper is a Node-only `undici` consumer that does not belong in a browser bundle. It ships as its own CommonJS entry and is imported directly (`require('<pkg>/auth/offlineTokenProvider')`).
* [[OND221-2830]](https://ondewo.atlassian.net/browse/OND221-2830) Tooling: `conventional-pre-commit` now runs before `giticket` at the commit-msg stage - with giticket first, its `[OND221-2830] fix: ...` rewrite was no longer valid Conventional Commits and every commit on a ticket branch failed. `README.md` is prettier-ignored where `.prettierrc` sets `useTabs` and markdownlint's MD010 de-tabs the same blocks, and the codegen `docker run` invocations no longer pass `-it`, which fails outside a TTY.

*****************

## Release ONDEWO Survey Js Client 2.0.0

### Improvements

* Tracking API Version [2.0.0](https://github.com/ondewo/ondewo-survey-api/releases/tag/2.0.0) ( [Documentation](https://ondewo.github.io/ondewo-survey-api/) )

*****************

## Release ONDEWO Survey Js Client 1.1.0

### Improvements

* Tracking API Version [1.1.0](https://github.com/ondewo/ondewo-survey-api/releases/tag/1.1.0) ( [Documentation](https://ondewo.github.io/ondewo-survey-api/) )
* Update to SURVEY client version tag 1.1.0
* [[OND211-2039]](https://ondewo.atlassian.net/browse/OND211-2039) - Implemented automated release for GitHub and NPM
* [[OND211-2039]](https://ondewo.atlassian.net/browse/OND211-2039) - Added pre-commit hooks and adjusted files to them

*****************

## Release ONDEWO Survey Js Client 0.6.0

### Improvements

* Initial SURVEY Js client, built on ONDEWO SURVEY API 0.6.0 (`SurveysPromiseClient`, FHIR client)
* Browser example: create a survey, default sample and FHIR client sample, JavaScript object to struct conversion for the create FHIR survey call

*****************
