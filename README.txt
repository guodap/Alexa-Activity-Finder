Testing instructions:
1.	Note: You can test on any Alexa device in your home connected to your Amazon account or download the free Alexa app and sign up.
2.	Press on this direct beta test invitation link to download the skill: https://skills-store.amazon.com/deeplink/tvt/6a979d467d9a8a1ab6d768b17856ca5604e3d04dbaf364fa218166aed94870f53b0d0c717bee5564f6909430b1a21cdccf375056b9aefb9bd009da9fc4e6f23baf775881e69d1c7e9449dfec28a95dfebdf35437ccd9e34861a345a62957176c0e8ff2bd28babd14824e3b2e225db189
3.	Enable all requested permissions.
4.	Make sure that you have the full device address set before trying to test it in ‘Settings, device settings, Alexa on the phone (or whatever device you’re using), device address’. There's a reported bug that happens if you do not.
5.	Make sure that you have 0 live ‘Enabled’ Activity Finder skills and only 1 ‘Dev’ Activity Finder skill. (Check this again if something goes wrong as sometimes Alexa downloads live skills instead of the Dev one)
6.	Read the skill's instructions before you use it just to get familiar… as I hope a user would.
7.	You can find skill permissions, skill instructions and the list of Enabled and Dev skills in the mobile app (for the instructions above) if you go to ‘More -> skills and games -> your skills -> dev tab or enabled tab -> activity finder skill’

Folder Structure:

Alexa Skill
    - assets
      |
      --> - Alexa skill icons for en-GB & fr-FR locales
    - interactionModels
      |
      --> - Alexas interaction models associating sample utterances to the targeted intents
    - lambda - Root folder of the skill containing the index.js file and package.json
      |
      --> - documents
            |
            --> Details for displaying the speech responses on devices with a UI (e.g. Amazon Echo Spot)
          - lib
            |
            --> The main logic of the Alexa skill which carries out the translations, querying Google, handlers for the intents, etc.
          - models
            |
            --> The models associating sample utterances to the targeted intents (when debugging locally)
          - resources
            |
            --> Contains the configuration file for setting the email setting and Google API key, also the email base HTML file which creates the email message
    - test
      |
      --> - e2e
            |
            --> Contains the tests for end to end workflows
          - unit
            |
            --> Contains the tests for unit testing functions    
    - test_output
      |
      --> - coverage
            |
            --> Contains the results and other test specific files for generating reports
          - report
            |
            --> Contains the report of the test outcomes      