console.log('CLIENT SCRIPT');

console.log('survey namespace:');
console.log(survey);
console.log('proto namespace:');
console.log(proto);

const CreateSurveyRequest = survey.CreateSurveyRequest;
const GetSurveyRequest = survey.GetSurveyRequest;
const FHIRClient = survey.FHIRClient;
const FHIRPromiseClient = survey.FHIRPromiseClient;

const Survey = survey.Survey;
const Question = survey.Question;
const SurveyInfo = survey.SurveyInfo;

const SurveysPromiseClient = survey.SurveysPromiseClient;
const SurveysClient = survey.SurveysClient;

function createSampleSurvey(client, requestMetaData) {
	let newSurvey = new Survey();
	newSurvey.setLanguageCode('de');
	//newSurvey.setSurveyId("projects/ddde0272-1d70-4927-a3b9-9837bfa66143/agent");
	newSurvey.setDisplayName('Sample survey');
	const questions = [];
	newSurvey.setQuestionsList(questions);
	const surveyInfo = new SurveyInfo();
	newSurvey.setSurveyInfo(surveyInfo);

	var request = new CreateSurveyRequest();
	request.setSurvey(newSurvey);

	console.log(request);
	return client.createSurvey(request, requestMetaData);
}

function getSurvey(client, requestMetaData, surveyId) {
	var request = new GetSurveyRequest();
	console.log(request);
	request.setSurveyId(surveyId);

	return client.getSurvey(request, requestMetaData);
	/*client.getSurvey(request, requestMetaData, (err, response) => {
        if(err){
            console.log("Received error: ")
            console.log(err)
        }
        else{
            console.log("Received response: ")
            console.log(response)
            console.log(response.getDisplayName())
        }
    })*/
}

function createSurveyClient(host) {
	//const hostName = "https://webgrpc-survey-develop.ondewo.com:443"
	const credentials = {};
	// ClientOptions
	// suppressCorsPreflight: boolean, withCredentials: boolean, this.unaryInterceptors; this.streamInterceptors; this.format; this.workerScope; this.useFetchDownloadStreams;
	//
	const clientOptions = {
		withCredentials: false,
		suppressCorsPreflight: false
	};

	//var client = new SurveysClient(host, credentials, clientOptions)
	var client = new SurveysPromiseClient(host, credentials, clientOptions);
	return client;
}

function createFHIRClient(host) {
	const credentials = {};
	const clientOptions = {
		withCredentials: false,
		suppressCorsPreflight: false
	};
	var client = new FHIRPromiseClient(host, credentials, clientOptions);
	return client;
}

const client = createSurveyClient('https://webgrpc-survey-develop.ondewo.com:443');
const requestMetaData = {
	Authorization: "<--Your authorization token-->",
	//Authorization: ''
};

getSurvey(client, requestMetaData, 'projects/ddde0272-1d70-4927-a3b9-9837bfa66143/agent')
	.then((survey) => {
		console.log('Fetched survey from server: ');
		console.log(survey);
	})
	.catch((err) => {
		console.log('Error occured, while create fetching survey: ');
		console.log(err);
	});

createSampleSurvey(client, requestMetaData)
.then((survey) => {
  console.log('Created survey: ');
  console.log(survey);

  //return getSurvey("projects/ddde0272-1d70-4927-a3b9-9837bfa66143/agent")
  return getSurvey(client, requestMetaData, survey.getSurveyId());
})
.then((survey) => {
  console.log('Fetched survey from server: ');
  console.log(survey);
})
.catch((err) => {
  console.log('Error occured, while create fetching survey: ');
  console.log(err);
});

function getSampleFHIRSurveyJson() {
	return {
		resourceType: 'Questionnaire',
		id: '69724-3',
		meta: {
			versionId: '2',
			lastUpdated: '2021-08-23T12:23:31.053+00:00',
			source: '#GCNaqRgPOfzKzXeq'
		},
		url: 'http://loinc.org/q/69724-3',
		name: 'Patient_health_questionnaire_item',
		title: 'Patient health questionnaire 4 item',
		status: 'draft',
		publisher: 'Regenstrief Institute, Inc.',
		contact: [
			{
				name: 'Regenstrief Institute, Inc.',
				telecom: [
					{
						system: 'url',
						value: 'http://loinc.org'
					}
				]
			}
		],
		copyright:
			'This content from LOINC® is copyright © 1995-2021 Regenstrief Institute, Inc. and the LOINC Committee, and available at no cost under the license at https://loinc.org/license/\r\nCopyright © Pfizer Inc. All rights reserved. Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc. No permission required to reproduce, translate, display or distribute.',
		code: [
			{
				system: 'http://loinc.org',
				code: '69724-3',
				display: 'Patient health questionnaire 4 item'
			}
		],
		item: [
			{
				linkId: '57491',
				code: [
					{
						system: 'http://loinc.org',
						code: '69725-0',
						display: 'Feeling nervous, anxious or on edge'
					}
				],
				prefix: 'PHQ4_01',
				text: 'Feeling nervous, anxious or on edge',
				type: 'choice',
				repeats: false,
				answerOption: [
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6568-5',
							display: 'Not at all'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6569-3',
							display: 'Several days'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6570-1',
							display: 'More than half the days'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6571-9',
							display: 'Nearly every day'
						}
					}
				]
			},
			{
				linkId: '57490',
				code: [
					{
						system: 'http://loinc.org',
						code: '68509-9',
						display: 'Over the past 2 weeks have you not been able to stop or control worrying'
					}
				],
				prefix: 'PHQ4_02',
				text: 'Over the past 2 weeks have you not been able to stop or control worrying',
				type: 'choice',
				repeats: false,
				answerOption: [
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6568-5',
							display: 'Not at all'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6569-3',
							display: 'Several days'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA18938-3',
							display: 'More days than not'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6571-9',
							display: 'Nearly every day'
						}
					}
				]
			},
			{
				linkId: '57489',
				code: [
					{
						system: 'http://loinc.org',
						code: '44250-9',
						display: 'Little interest or pleasure in doing things'
					}
				],
				prefix: 'PHQ4_03',
				text: 'Little interest or pleasure in doing things',
				type: 'choice',
				repeats: false,
				answerOption: [
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6568-5',
							display: 'Not at all'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6569-3',
							display: 'Several days'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6570-1',
							display: 'More than half the days'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6571-9',
							display: 'Nearly every day'
						}
					}
				]
			},
			{
				linkId: '57488',
				code: [
					{
						system: 'http://loinc.org',
						code: '44255-8',
						display: 'Feeling down, depressed, or hopeless'
					}
				],
				prefix: 'PHQ4_04',
				text: 'Feeling down, depressed, or hopeless',
				type: 'choice',
				repeats: false,
				answerOption: [
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6568-5',
							display: 'Not at all'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6569-3',
							display: 'Several days'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6570-1',
							display: 'More than half the days'
						}
					},
					{
						valueCoding: {
							system: 'http://loinc.org',
							code: 'LA6571-9',
							display: 'Nearly every day'
						}
					}
				]
			},
			{
				linkId: '58625',
				text: 'Patient health questionnaire 4 item total score',
				type: 'decimal'
			}
		]
	};
}

function createFhirSurvey(client, requestMetaData, jsonData) {

	var request = new CreateFHIRSurveyRequest();
	request.setFhirQuestionnaire(jsonData);

	console.log(request);
	return client.createFHIRSurvey(request, requestMetaData);
}

const fhirClient = createFHIRClient('https://webgrpc-survey-develop.ondewo.com:443')

createFhirSurvey()(client, requestMetaData, getSampleFHIRSurveyJson())
.then((survey) => {
  console.log('Created FHIR survey: ');
  console.log(survey);

  return getSurvey(client, requestMetaData, survey.getSurveyId());
})
.then((survey) => {
  console.log('Fetched survey from server: ');
  console.log(survey);
})
.catch((err) => {
  console.log('Error occured, while create fetching survey: ');
  console.log(err);
});