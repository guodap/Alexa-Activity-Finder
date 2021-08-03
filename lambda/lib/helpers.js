// ==========================================================
// Helper functions

// Get geolocation of device using Alexa app
// https://developer.amazon.com/en-US/docs/alexa/custom-skills/location-services-for-alexa-skills.html#:~:text=Go%20to%20the%20developer%20console,enable%20the%20Location%20Services%20button.

const axios = require('axios');
const fs = require('fs');
const nodemailer = require('nodemailer');

const configFilePath = './resources/config.json';
const emailFilePath = './resources/email_base.html';
const configFile = JSON.parse(fs.readFileSync(configFilePath,'utf8'));
const emailFile = fs.readFileSync(emailFilePath,'utf8');

const fetchPlaces = async (location, keyword, requestType) => {
    const url = 'https://maps.googleapis.com/maps/api/place/';
    const nearby_method = 'nearbysearch/json?location=';
    const text_method = 'textsearch/json?query=';
    const google_api_key = '&key=' + configFile['google-api'].key;
    const placesURL = url + (requestType === 'nearbysearch' 
        ? nearby_method + location + '&radius=40000&keyword=' + keyword + '&type=point_of_interest' + google_api_key
        : text_method + keyword + google_api_key);

    try {
        const { data } = await axios.get(placesURL); //returns maximum 20 results
        let results = [];
        if (data) 
            if (data.status !== 'OK') 
                console.error('Google APIs request error', data.error_message);
            else
                data.results.forEach(place => {
                    if (place.business_status !== 'CLOSED_TEMPORARILY')
                        if (!place.name.toLowerCase().includes('things to do'))
                            results.push(place);
                });
        return results;
    } 
    catch (error){
        console.error('Cannot fetch places', error);
    }
};

// Created an emailing mechanism for sending itineraries to the skill users email address.
// Used the sample code available here:
// https://www.w3schools.com/nodejs/nodejs_email.asp

function sendEmail(handlerInput, address, msgContents){
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    try{
        var transporter = nodemailer.createTransport({
            /*
             *   Required to use your own Gmail account to act as a proxy for sending emails
             */
            service: configFile.email.service,
            auth: {
                user: configFile.email.username,
                pass: configFile.email.password
            }
        });
    
        var mailOptions = {
            /*
             *    General email contents and destination
             */
            from: 'things-to-do@gmail.com',
            to: address,
            subject: requestAttributes.t('EMAIL_SUBJECT'),
            html: msgContents
        };
    
        transporter.sendMail(mailOptions, function(error, info){
            error ? console.log(error) : console.log('Email sent: ' + info.response);
        });
    }
    catch (error){
        return handlerInput.responseBuilder
        .withShouldEndSession(true)
        .speak(error)
        .getResponse();
    }
}

function parseItineraryEmail(handlerInput, pinned, name){
    // Code to read in the email HTML base file 
    // https://stackoverflow.com/questions/10058814/get-data-from-fs-readfile
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const table = requestAttributes.t('HTML_TABLE_HEADER');
    const heading = requestAttributes.t('HTML_EMAIL_HEADING');
    const paragraph = requestAttributes.t('HTML_EMAIL_GREETING', name);
    const tips = requestAttributes.t('HTML_TIPS');

    let rows = "";

    pinned.forEach(place =>{
        let open_now = "";
        let rating = "N/A";
        if(place.rating)
            rating = `${place.rating}/5`;
        if (place.opening_hours)
            open_now = place.opening_hours.open_now ? requestAttributes.t('YES') : requestAttributes.t('NO');
        const row = `<tr><td><a href='https://www.google.com/maps/place/${place.name}/@${place.geometry.location.lat},${place.geometry.location.lng},14z'>${place.name}</a></td><td>${rating}</td><td>${place.formatted_address.replace(',', '<br />')}</td><td>${open_now}</td></tr>`;
        rows += row;
    });

    let htmlTable = table.replace('||rows||', rows);
    let content = paragraph + htmlTable;
    let html = emailFile.replace('||heading||', heading).replace('||content||', content).replace('||tips||', tips);
    return html;
}

module.exports = {
    fetchPlaces,
    sendEmail,
    parseItineraryEmail
}