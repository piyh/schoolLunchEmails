# schoolLunchEmails

A repo to email me and my wife daily with the food my kid is served at school.


# Install

`git clone https://github.com/piyh/schoolLunchEmails.git`

`cd schoolLunchEmails`

[Install NVM](https://github.com/nvm-sh/nvm)

`nvm install`

`nvm use`

`npm i`

Put gmail App Password in `password.txt`

Put emails that will receive message `emails.txt`, one email per line.

Typescript compile with:

`npx tsc`

Then run a test with:

`node build/main.js`

# Schedule the job

Grab the output from `which node`

`crontab -e`

Schedule the job at 7am Monday through Friday with:
 `0 7 * * 1-5 /home/pi/.nvm/versions/node/v20.11.1/bin/node /home/pi/schoolLunchEmails/build/main.js`

 Make sure you substitute your node path and repo directory correctly on each part