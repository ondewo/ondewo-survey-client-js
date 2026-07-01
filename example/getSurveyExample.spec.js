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

// Unit tests proving example/getSurveyExample.js works WITHOUT a live gRPC server: the Surveys
// promise client is a hand-rolled mock and the Keycloak token endpoint is stubbed via the offline
// provider's injectable `fetchImpl`. There is NO network access.
//   node --test example/getSurveyExample.spec.js

'use strict';

const { test: runTestCase } = require('node:test');
const assert = require('node:assert/strict');

const { login } = require('../auth/offlineTokenProvider');
const {
	AUTHORIZATION_HEADER,
	createSurveysClient,
	buildAuthMetadata,
	buildGetSurveyRequest,
	getSurvey
} = require('./getSurveyExample');

/** @type {string} A representative survey id (`projects/<project-id>/agent`). */
const SURVEY_ID = 'projects/ddde0272-1d70-4927-a3b9-9837bfa66143/agent';
/** @type {string} The display name carried by the fake Survey response. */
const DISPLAY_NAME = 'JS Client - sample survey';
/** @type {string} The bearer header value the fake token provider yields. */
const BEARER_HEADER = 'Bearer access-1';

/**
 * A stand-in for the generated `GetSurveyRequest` message, mirroring its setter/getter surface.
 */
class FakeGetSurveyRequest {
	constructor() {
		/** @type {string} The survey id set on the request. */
		this.surveyId = '';
	}

	/**
	 * @param {string} surveyId
	 *     The survey id to address.
	 * @returns {void}
	 */
	setSurveyId(surveyId) {
		this.surveyId = surveyId;
	}

	/**
	 * @returns {string}
	 *     The survey id set on the request.
	 */
	getSurveyId() {
		return this.surveyId;
	}
}

/**
 * Build a fake `Survey` response message exposing the getters the example reads.
 *
 * @param {string} surveyId
 *     The survey id the fake message returns.
 * @param {string} displayName
 *     The display name the fake message returns.
 * @returns {{ getSurveyId: () => string, getDisplayName: () => string }}
 *     The fake Survey message.
 */
function makeFakeSurvey(surveyId, displayName) {
	return {
		getSurveyId: () => surveyId,
		getDisplayName: () => displayName
	};
}

/**
 * A fake `SurveysPromiseClient` recording the `(request, metadata)` of each `getSurvey` call.
 *
 * @param {object} surveyResponse
 *     The message the fake resolves `getSurvey` with.
 * @returns {{ calls: { request: object, metadata: object }[], getSurvey: (request: object, metadata: object) => Promise<object> }}
 *     The fake client plus its shared call log.
 */
function makeFakeClient(surveyResponse) {
	/** @type {{ request: object, metadata: object }[]} */
	const calls = [];
	return {
		calls,
		getSurvey(request, metadata) {
			calls.push({ request, metadata });
			return Promise.resolve(surveyResponse);
		}
	};
}

/** @type {{ getAuthorizationHeader: () => string }} A minimal fake token provider. */
const fakeTokenProvider = { getAuthorizationHeader: () => BEARER_HEADER };

runTestCase('createSurveysClient constructs the generated client with the endpoint + options', () => {
	/** @type {{ endpoint: string, credentials: object, options: object }[]} */
	const constructions = [];
	const clientOptions = { withCredentials: false, suppressCorsPreflight: false };
	class FakeSurveysPromiseClient {
		constructor(endpoint, credentials, options) {
			constructions.push({ endpoint, credentials, options });
		}
	}

	const client = createSurveysClient(FakeSurveysPromiseClient, 'https://webgrpc-survey.ondewo.com:443', clientOptions);

	assert.ok(client instanceof FakeSurveysPromiseClient);
	assert.equal(constructions.length, 1);
	assert.equal(constructions[0].endpoint, 'https://webgrpc-survey.ondewo.com:443');
	assert.deepEqual(constructions[0].options, clientOptions);
});

runTestCase('buildAuthMetadata carries the provider bearer token under the Authorization header', () => {
	const metadata = buildAuthMetadata(fakeTokenProvider);
	assert.deepEqual(metadata, { [AUTHORIZATION_HEADER]: BEARER_HEADER });
});

runTestCase('buildGetSurveyRequest sets the survey id on the request', () => {
	const request = buildGetSurveyRequest(FakeGetSurveyRequest, SURVEY_ID);
	assert.equal(request.getSurveyId(), SURVEY_ID);
});

runTestCase('getSurvey builds the request, attaches bearer metadata, and returns the Survey response', async () => {
	const client = makeFakeClient(makeFakeSurvey(SURVEY_ID, DISPLAY_NAME));

	const surveyMessage = await getSurvey({
		client,
		GetSurveyRequest: FakeGetSurveyRequest,
		tokenProvider: fakeTokenProvider,
		surveyId: SURVEY_ID
	});

	assert.equal(client.calls.length, 1);
	assert.equal(client.calls[0].request.getSurveyId(), SURVEY_ID);
	assert.deepEqual(client.calls[0].metadata, { [AUTHORIZATION_HEADER]: BEARER_HEADER });
	assert.equal(surveyMessage.getSurveyId(), SURVEY_ID);
	assert.equal(surveyMessage.getDisplayName(), DISPLAY_NAME);
});

runTestCase('getSurvey sources its bearer token from a real (fetch-mocked) offline-token provider', async () => {
	// End-to-end proof of the CURRENT Keycloak bearer auth: a real OfflineTokenProvider whose token
	// endpoint is mocked (no network) supplies the exact Authorization header the example sends.
	/** @type {() => Promise<{ ok: boolean, status: number, text: () => Promise<string> }>} */
	const fetchImpl = () =>
		Promise.resolve({
			ok: true,
			status: 200,
			text: () =>
				Promise.resolve(JSON.stringify({ access_token: 'kc-access', refresh_token: 'kc-offline', expires_in: 300 }))
		});
	const tokenProvider = await login({
		keycloakUrl: 'https://auth.example.com/auth',
		realm: 'ondewo-ccai-platform',
		clientId: 'ondewo-survey-cai-sdk-public',
		username: 'tech-user@example.com',
		password: 'super-secret',
		fetchImpl
	});
	try {
		const client = makeFakeClient(makeFakeSurvey(SURVEY_ID, DISPLAY_NAME));

		await getSurvey({ client, GetSurveyRequest: FakeGetSurveyRequest, tokenProvider, surveyId: SURVEY_ID });

		assert.deepEqual(client.calls[0].metadata, { [AUTHORIZATION_HEADER]: 'Bearer kc-access' });
	} finally {
		tokenProvider.stop();
	}
});
