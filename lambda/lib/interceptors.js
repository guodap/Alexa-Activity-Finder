const Alexa = require('ask-sdk-core');
// i18n dependency
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const languageStrings = require('./localisation')
// {
//     'en-GB': require('../localization/en-GB'),
//     // 'it-IT': require('./localization/it-IT'),
//     // 'es-ES': require('./localization/es-ES'),
//     'fr-FR': require('../localization/fr-FR')
// };

const LoggingRequestInterceptor = {
    // This request interceptor will log all incoming requests to this lambda
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    }
};

const LoggingResponseInterceptor = {
    // This response interceptor will log all outgoing responses of this lambda
    process(handlerInput, response) {
        console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
};

const LocalisationRequestInterceptor = {
    /** 
     *  https://www.programmersought.com/article/87021458326/
    */
   
    process(handlerInput) {
        const localizationClient = i18n.use(sprintf).init({
            lng: Alexa.getLocale(handlerInput.requestEnvelope),
            fallbackLng: Alexa.getLocale(handlerInput.requestEnvelope), // fallback to EN if locale doesn't exist
            // debug: true,
            resources: languageStrings,
            returnObjects: true
        });
 
        localizationClient.localize = function () {
            const args = arguments;
            let values = [];
 
            for (var i = 1; i < args.length; i++) 
                values.push(args[i]);

            const value = i18n.t(args[0], {
                returnObjects: true,
                postProcess: 'sprintf',
                sprintf: values
            });

            return (Array.isArray(value) ? value[Math.floor(Math.random() * value.length)] : value);
        }
 
        const attributes = handlerInput.attributesManager.getRequestAttributes();
        attributes.t = function (...args) { // pass on arguments to the localizationClient
            return localizationClient.localize(...args);
        };
    },
};

module.exports = {
    LocalisationRequestInterceptor,
    LoggingRequestInterceptor,
    LoggingResponseInterceptor
}