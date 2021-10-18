console.log('CLIENT SCRIPT');
console.log(proto)

var SurveysPromiseClient = survey.SurveysPromiseClient;
var SurveysClient = survey.SurveysClient;
console.log(SurveysClient)

//const hostName = "webgrpc-survey.ondewo.com:443"
const hostName = "https://webgrpc-survey-develop.ondewo.com:443"
const credentials = {
}
const clientOptions = {
    withCredentials: false,
    suppressCorsPreflight: false
}
// ClientOptions
// suppressCorsPreflight: boolean, withCredentials: boolean, this.unaryInterceptors; this.streamInterceptors;
// this.format; this.workerScope; this.useFetchDownloadStreams;

var client = new SurveysClient(hostName, credentials, clientOptions)

var request = new proto.ondewo.survey.GetSurveyRequest();
console.log(request)
request.setSurveyId("projects/ddde0272-1d70-4927-a3b9-9837bfa66143/agent")

console.log(client)

const requestMetaData = {
    "Authorization": "<--Your authorization token-->",
}

client.getSurvey(request, requestMetaData, (err, response) => {
    if(err){
        console.log("Received error: ")
        console.log(err)
    }
    else{
        console.log("Received response: ")
        console.log(response)
        console.log(response.getDisplayName())
    }
})