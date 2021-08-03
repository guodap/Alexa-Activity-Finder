async function deviceLocation(requestEnvelope, serviceClientFactory){
    // Retrieves the device location. 
    // https://forums.developer.amazon.com/questions/189792/alexa-address-api-returns-403-forbidden.html
    const { deviceId } = requestEnvelope.context.System.device;
    const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
    //const address = await deviceAddressServiceClient.getCountryAndPostalCode(deviceId);
    let device_location = await deviceAddressServiceClient.getFullAddress(deviceId);

    if (device_location)
        if (device_location['city'] !== '' && device_location['stateOrRegion'] !== '')
            return device_location['city'] + ", " + device_location['stateOrRegion'];
        else if (device_location['city'] === '')
            return device_location['stateOrRegion'];
        else
            return device_location['city'];
    return device_location
}

function formattedPlaces(places){
    let formatted_places = "";
    for(let x = 0; x < places.length; x++){
        let place_name = places[x].name.replace('&', 'and').replace('é', 'e');
        if (places.length === 1)
            formatted_places += place_name;
        else if (x === places.length-1)
            formatted_places += (' and ' + place_name);
        else
            formatted_places += (x === places.length-2 ? place_name : place_name + ', ');
    }
    return formatted_places + ". ";
}

function processPin(handlerInput, pin, pinned, recommendations){
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    if (!['all', 'everything'].includes(pin)){
        for(let counter = 0; counter < recommendations.length; counter++){
            if (recommendations[counter].name.replace("'", '').toLowerCase().includes(pin.toLowerCase())){
                if (pinned.length > 0){
                    if (pinExists(recommendations[counter], pinned)){
                        // pin already exists
                        return requestAttributes.t('PIN_EXISTS', pin);
                    }
                    else{
                        pinned.push(recommendations[counter]);
                    }
                }
                else{
                    pinned.push(recommendations[counter]);
                }
                // pin added
                return requestAttributes.t('PIN_LOCATION', pin);
            }
        }
    }
    else{
        let counter = 0;
        if(recommendations.length > 0){
            recommendations.forEach(location => {
                if (!pinExists(location, pinned)){
                    pinned.push(location);
                    counter++;
                }
            });
            return requestAttributes.t('PIN_LOCATIONS', counter);
        }
        else{
            return requestAttributes.t('PIN_NO_RECS');
        }
    }
        
    return requestAttributes.t('PIN_NOT_FOUND');
}

function pinExists(location, pinned){
    for(let counter = 0; counter < pinned.length; counter++)
        if (location.name === pinned[counter].name)
            return true;
    return false;
}

function permissionsResponseBuilder(handlerInput, speakOutput, permissions){
    return handlerInput.responseBuilder
        .withShouldEndSession(true)
        .speak(speakOutput)
        .withAskForPermissionsConsentCard(permissions)
        .getResponse();
}

function repromptResponseBuilder(handlerInput, speakOutput, reprompt){
    return handlerInput.responseBuilder
        .withShouldEndSession(false)
        .speak(speakOutput)
        .reprompt(reprompt)
        //.withSimpleCard('Inspiration', speechText) //why commented out
        .getResponse();
}

function speakResponseBuilder(handlerInput, speakOutput){
    return handlerInput.responseBuilder
        .withShouldEndSession(false)
        .speak(speakOutput)
        .getResponse();
}

function speakResponseBuilderNoSession(handlerInput, speakOutput){
    return handlerInput.responseBuilder
        .withShouldEndSession(true)
        .speak(speakOutput)
        .getResponse();
}

module.exports = {
    deviceLocation,
    formattedPlaces,
    processPin,
    pinExists,
    repromptResponseBuilder,
    permissionsResponseBuilder,
    speakResponseBuilder,
    speakResponseBuilderNoSession
}