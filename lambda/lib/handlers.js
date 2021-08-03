const Alexa = require('ask-sdk-core');
const helpers = require('./helpers');
const logic = require('./logic');

// Current recommendations
var places = [];
// Keep track of the pinned locations
var pinned = [];
// Track the previous returned results
var prevResults = [];

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const speakOutput = requestAttributes.t('WELCOME');
        
        return logic.speakResponseBuilder(handlerInput, speakOutput);
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const speakOutput = requestAttributes.t('HELP');

        return logic.speakResponseBuilder(handlerInput, speakOutput);
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const speakOutput = requestAttributes.t('GOODBYE');
        prevResults = [];
        pinned = [];
        return logic.speakResponseBuilderNoSession(handlerInput, speakOutput);
    }
};

const FallbackIntentHandler = {
    /* *
    * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
    * It must also be defined in the language model (if the locale supports it)
    * This handler can be safely added but will be ingnored in locales that do not support it yet 
    * */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const speakOutput = requestAttributes.t('FALLBACK');
        const reprompt = requestAttributes.t('REPROMPT_ERROR');

        return logic.repromptResponseBuilder(handlerInput, speakOutput, reprompt);
    }
};

const SessionEndedRequestHandler = {
    /* *
    * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
    * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
    * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
    * */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};

const IntentReflectorHandler = {
    /* *
    * The intent reflector is used for interaction model testing and debugging.
    * It will simply repeat the intent the user said. You can create custom handlers for your intents 
    * by defining them above, then also adding them to the request handler chain below 
    * */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const speakOutput = requestAttributes.t('REFLECTOR', intentName);

        return logic.speakResponseBuilder(handlerInput, speakOutput);
    }
};

const ErrorHandler = {
    /**
     * Generic error handling to capture any syntax or routing errors. If you receive an error
     * stating the request handler chain is not found, you have not implemented a handler for
     * the intent being invoked or included it in the skill builder below 
     * */
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const speakOutput = requestAttributes.t('ERROR');
        const repromptOutput = requestAttributes.t('REPROMPT_ERROR');
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return logic.speakResponseBuilderNoSession(handlerInput, speakOutput)
    }
};

const RecommendThingsToDoIntent = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'RecommendThingsToDoIntent';
    },
    async handle(handlerInput) {
        // Checks whether the device has permissions for locations.
        // After coming across issues with permissions I found the link below
        // which explained the correct way to get the location based on the 
        // permissions I gave the app.
        // https://forums.developer.amazon.com/questions/189792/alexa-address-api-returns-403-forbidden.html
        try {
            const { requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;
            const accessToken = requestEnvelope.context.System.user.permissions && requestEnvelope.context.System.apiAccessToken;
            const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
            const keyword = await Alexa.getSlotValue(handlerInput.requestEnvelope, 'keyword');
            let location = await Alexa.getSlotValue(handlerInput.requestEnvelope, 'location');
            let speakOutput = requestAttributes.t("PERMISSIONS", "address");
            let reprompt = requestAttributes.t('REPROMPT_REC');
                        
            // If no access token returned, user must give the skill permissions to access data in Alexa app 
            if (!accessToken && !location)
                return logic.permissionsResponseBuilder(handlerInput, speakOutput, [ 'read::alexa:device:all:address']);
            
            // If user did not supply a location, it will attempt to retrieve the user device location if permissions are enabled
            if (!location)
                location = await logic.deviceLocation(requestEnvelope, serviceClientFactory);
            
            const query = (keyword && location) ? location + '+' + keyword : location + '%20things%20to%20do';
            speakOutput = (keyword) ? requestAttributes.t("KEYWORD_LOCATIONS", keyword, location) : requestAttributes.t("LOCATIONS", location);
            places = await helpers.fetchPlaces(location, query, 'textsearch');
            prevResults = places.slice(0, 5);

            if (places.length === 0){
                speakOutput = requestAttributes.t('NO_LOCATIONS');
                reprompt = requestAttributes.t('REPROMPT_REC_NO_LOCATIONS');
            }
            else{
                speakOutput += logic.formattedPlaces(places.slice(0, 5));
            }

            return logic.repromptResponseBuilder(handlerInput, speakOutput, reprompt);
        }
        catch (error) {
            throw error;
        }
    }
};

const PutAPinOnItIntent = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'PutAPinOnItIntent';
    },
    async handle(handlerInput) {
        try {
            let pin = await Alexa.getSlotValue(handlerInput.requestEnvelope, 'location_names');
            const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
            let speakOutput = requestAttributes.t('PIN_NOT_SPECIFIED');
            let reprompt = requestAttributes.t('REPROMPT_PIN_LOCATIONS');
            
            if(pin)
                speakOutput = logic.processPin(handlerInput, pin.replace('&', 'and'), pinned, prevResults);

            return logic.repromptResponseBuilder(handlerInput, speakOutput, reprompt);
        }
        catch (error) {
            throw error;
        }
    }
}

const ReadItineraryIntent = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'ReadItineraryIntent';
    },
    handle(handlerInput) {
        try {
            const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
            
            let speakOutput = pinned.map(location => {
               return location.name; 
            });
            
            let reprompt = requestAttributes.t('REPROMPT_REC_NO_LOCATIONS');

            return logic.repromptResponseBuilder(handlerInput, speakOutput, reprompt);
        }
        catch (error) {
            throw error;
        }
    }
}

const SendItineraryIntent = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'SendItineraryIntent';
    },
    async handle(handlerInput) {
        try {
            const { requestEnvelope, serviceClientFactory } = handlerInput;
            const accessToken = requestEnvelope.context.System.user.permissions && requestEnvelope.context.System.apiAccessToken;
            const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
            let speakOutput = requestAttributes.t('PERMISSIONS', "name and email");

            if (!accessToken)
                return logic.permissionsResponseBuilder(handlerInput, speakOutput, ['alexa::profile:email:read', 'alexa::profile:name:read']);

            // Code to retrieve the user email address
            // https://stackoverflow.com/questions/53683891/alexa-skill-retrieve-customer-mail-address-node-js

            const upsServiceClient = serviceClientFactory.getUpsServiceClient();
            const email = await upsServiceClient.getProfileEmail();
            const name = await upsServiceClient.getProfileName();
            speakOutput = requestAttributes.t("EMAIL_SENT", email);

            if (pinned.length > 0){
                const emailMsg = helpers.parseItineraryEmail(handlerInput, pinned, name);
                await helpers.sendEmail(handlerInput, email, emailMsg);
                pinned = [];
                prevResults = [];
                places = [];
                return logic.speakResponseBuilderNoSession(handlerInput, speakOutput);    
            }
            else{
                speakOutput = requestAttributes.t('EMAIL_NO_PINS');
                let reprompt = requestAttributes.t('REPROMPT_ERROR');
                return logic.repromptResponseBuilder(handlerInput, speakOutput, reprompt);    
            }
    
        }
        catch (error) {
            throw error;
        }
    }
}

module.exports = {
    LaunchRequestHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler,
    ErrorHandler,
    RecommendThingsToDoIntent,
    PutAPinOnItIntent,
    SendItineraryIntent
}