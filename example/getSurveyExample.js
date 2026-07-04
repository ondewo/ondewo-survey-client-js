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

// Minimal, idiomatic example: fetch a single Survey over gRPC-web using a Keycloak bearer token.
//
// The generated Surveys gRPC-web client (`SurveysPromiseClient`) and message classes
// (`GetSurveyRequest`, `Survey`) live in the compiled bundle `api/ondewo_survey_api.js`, exposed as
// the `survey` global in a browser / picked up by a bundler. They are passed IN to the helpers below
// so this example stays pure and unit-testable with mocks (see getSurveyExample.spec.js) -- there is
// NO live gRPC server and NO real Keycloak in the tests.
//
// Auth is bearer-only: a short-lived Keycloak access token is obtained (and refreshed) by
// ../auth/offlineTokenProvider.js and sent as an `Authorization: Bearer <token>` gRPC metadata header.
//
// Browser / bundler wiring (put behind your build's module system):
//
//   const { login } = require('@ondewo/ondewo-survey-client-js/auth/offlineTokenProvider');
//   const { SurveysPromiseClient, GetSurveyRequest } = survey; // `survey` = the compiled bundle global
//
//   const tokenProvider = await login({
//     keycloakUrl: 'https://auth.ondewo.com/auth',
//     realm: 'ondewo-ccai-platform',
//     clientId: 'ondewo-survey-cai-sdk-public',
//     username: '<tech-user>',
//     password: '<password>'
//   });
//   const client = createSurveysClient(SurveysPromiseClient, 'https://webgrpc-survey.ondewo.com:443', {});
//   try {
//     const surveyMessage = await getSurvey({
//       client,
//       GetSurveyRequest,
//       tokenProvider,
//       surveyId: 'projects/<project-id>/agent'
//     });
//     console.log('Fetched survey:', surveyMessage.getSurveyId(), surveyMessage.getDisplayName());
//   } finally {
//     tokenProvider.stop();
//   }

'use strict';

/** The gRPC metadata header key carrying the Keycloak bearer token. */
const AUTHORIZATION_HEADER = 'Authorization';

/**
 * Construct a Surveys gRPC-web promise client. The generated client class is injected so this factory
 * is unit-testable without the browser-only compiled bundle.
 *
 * @param {new (endpoint: string, credentials: object, options: object) => object} SurveysPromiseClient
 *     The generated `SurveysPromiseClient` class (from the `survey` bundle global).
 * @param {string} endpoint
 *     The gRPC-web endpoint, e.g. `https://webgrpc-survey.ondewo.com:443`.
 * @param {object} clientOptions
 *     grpc-web client options (e.g. `{ withCredentials: false, suppressCorsPreflight: false }`).
 * @returns {object}
 *     A ready-to-use `SurveysPromiseClient` instance.
 */
function createSurveysClient(SurveysPromiseClient, endpoint, clientOptions) {
	const credentials = {};
	return new SurveysPromiseClient(endpoint, credentials, clientOptions);
}

/**
 * Build the gRPC call metadata carrying the current Keycloak bearer token.
 *
 * @param {{ getAuthorizationHeader: () => string }} tokenProvider
 *     A live provider (from `login()` in ../auth/offlineTokenProvider.js) exposing the
 *     `Bearer <access_token>` header value.
 * @returns {{ [key: string]: string }}
 *     The metadata object to pass as the second argument of a gRPC-web call.
 */
function buildAuthMetadata(tokenProvider) {
	return { [AUTHORIZATION_HEADER]: tokenProvider.getAuthorizationHeader() };
}

/**
 * Build a `GetSurveyRequest` addressing a single survey by id.
 *
 * @param {new () => { setSurveyId: (surveyId: string) => void }} GetSurveyRequest
 *     The generated `GetSurveyRequest` message class (from the `survey` bundle global).
 * @param {string} surveyId
 *     The survey id, formatted as `projects/<project-id>/agent`.
 * @returns {{ setSurveyId: (surveyId: string) => void }}
 *     The populated request message.
 */
function buildGetSurveyRequest(GetSurveyRequest, surveyId) {
	const request = new GetSurveyRequest();
	request.setSurveyId(surveyId);
	return request;
}

/**
 * Fetch a single Survey: build the bearer metadata and the request, invoke the `GetSurvey` RPC, and
 * return the resolved `Survey` message for the caller to handle.
 *
 * @param {object} params
 * @param {{ getSurvey: (request: object, metadata: object) => Promise<object> }} params.client
 *     A `SurveysPromiseClient` (or any object exposing a promise-returning `getSurvey`).
 * @param {new () => { setSurveyId: (surveyId: string) => void }} params.GetSurveyRequest
 *     The generated `GetSurveyRequest` message class.
 * @param {{ getAuthorizationHeader: () => string }} params.tokenProvider
 *     The live Keycloak token provider supplying the `Authorization` header.
 * @param {string} params.surveyId
 *     The survey id to fetch, formatted as `projects/<project-id>/agent`.
 * @returns {Promise<object>}
 *     The resolved `Survey` message.
 */
async function getSurvey({ client, GetSurveyRequest, tokenProvider, surveyId }) {
	const metadata = buildAuthMetadata(tokenProvider);
	const request = buildGetSurveyRequest(GetSurveyRequest, surveyId);
	return client.getSurvey(request, metadata);
}

module.exports = { AUTHORIZATION_HEADER, createSurveysClient, buildAuthMetadata, buildGetSurveyRequest, getSurvey };
