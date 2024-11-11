'use-strict'
import nodemailer from "nodemailer";
import fs from 'fs';
import path from 'path';

const BASE_API_URL = 'https://dmschools.api.nutrislice.com/menu/api/weeks/school/jess-franklin-taylor/menu-type/{lunchOrBreakfast}/{YYYY/MM/DD}'
const BASE_DISPLAY_URL = 'https://dmschools.nutrislice.com/menu/jess-franklin-taylor/{lunchOrBreakfast}/{YYYY/MM/DD}'

const DATE = new Date()
if (todayOrTomorrow() === "Tomorrow"){
  DATE.setDate(DATE.getDate()+1);
}
const YEAR = DATE.getFullYear().toString().padStart(2, "0")
const MONTH = (DATE.getMonth()+1).toString().padStart(2, "0")
const DAY = DATE.getDate().toString().padStart(2, "0")
const DATE_COMPARE_STRING = `${YEAR}-${MONTH}-${DAY}`
// hour at which the email will switch to tomorrow instead of today
// https://dmschools.api.nutrislice.com/menu/api/weeks/school/jess-franklin-taylor/menu-type/lunch/2024/02/19/

const EMAIL_FILE = path.join(__dirname, '../emails.txt');
const PW_FILE = path.join(__dirname, '../password.txt');

type Meals = {
  breakfast: string[],
  lunch: string[]
}

type Day = "Today" | "Tomorrow"

function todayOrTomorrow(): Day {
  const dayCutoffHour = 4
  if (dayCutoffHour >= new Date().getHours()){
    return "Tomorrow" 
  }
  return "Today"
}

function getMealUrl(meal:keyof Meals, type: "display" | "api"){
  if (type === "api"){
    const dateUrlString = `${YEAR}/${MONTH}/${DAY}`
    return BASE_API_URL.replace('{YYYY/MM/DD}', dateUrlString).replace('{lunchOrBreakfast}', meal)
  } 
  // note `-` instead of `/` in replacement string
  const dateUrlString = `${YEAR}-${MONTH}-${DAY}`
  return   BASE_DISPLAY_URL.replace('{YYYY/MM/DD}', dateUrlString).replace('{lunchOrBreakfast}', meal)
}

async function fetchMealsFromSite():Promise<Meals> {
  const todaysFood:Meals = {
    'breakfast':[],
    'lunch':[]
  }
  
  for (const meal of Object.keys(todaysFood) as (keyof Meals)[]) {
    const url = getMealUrl(meal, "api")
    try {
      // Fetch the webpage
      const response = await fetch(url);
      if (response.status !== 200){
        throw new Error(`got ${response.status} code when expecting 200`)
      }
      const jsonBody = await response.json();

      const days = jsonBody.days
      let todaysMenuItems; 
      for (const day of days){
        if (day['date'] === DATE_COMPARE_STRING){
          todaysMenuItems = day['menu_items']
          break
        }
      }
      if (!todaysMenuItems){
        continue;
      }
      for (const menuItem of todaysMenuItems){
        const foodName = menuItem.food?.name
        if (foodName){
          todaysFood[meal].push(foodName)
        }
      }
    } catch (error) {
      console.error('Error fetching page:', error);
    }
  }
  console.log("done with main loop")
  return todaysFood
}


/**
 * Returns the contents of a file synchronously.
 */
function readFileSyncToString(filePath:string):string {
  try {
      // Synchronously read the file content
      const data = fs.readFileSync(filePath, { encoding: 'utf8' });
      return data;
  } catch (err) {
      console.error('Error reading file:', err);
      return ''; // or throw err; to propagate the error to the caller
  }
}

function composeEmailBody(meals:Meals) {
  if (
      (!meals.breakfast && !meals.lunch)
      ||
      (meals.breakfast.length === 0 && meals.lunch.length === 0)
    ){
    console.log("not sending email due to blank breakfast and lunch")
    return ''
  }
  // Helper function to format meal items into a bulleted list
  function formatMealItems(items:string[]) {
    return items.map(item => `• ${item}`).join('\n');
  }

  // Construct bulleted lists for breakfast and lunch
  const breakfastList = formatMealItems(meals.breakfast);
  const lunchList = formatMealItems(meals.lunch);
  
  
  // Combine and return the full message with lists
  let body =  `${todayOrTomorrow()}, Finn is having the following for breakfast:\n${breakfastList}\n\nFor lunch, he'll be having:\n${lunchList}\n\n`;
  body += `${getMealUrl("breakfast", "display")}`
  return body
}


async function sendEmail(body:string, emailList:string[], password:string) {
  if (!body){
    console.log("not sending email due to blank body")
    return
  }
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'captionsearchio@gmail.com', 
      pass: password
    }
  });

  let mailOptions = {
    from: '"Ryan\'s Finn Food Script" <captionsearchio@gmail.com>', // Sender address
    to: emailList, // List or string for recipients
    subject: `Finn Food for ${DATE_COMPARE_STRING}`, 
    text: body, // Plain text body
    // html: '<b>Hello world?</b>' // HTML body content
  };

  // Send the email
  let info = await transporter.sendMail(mailOptions);

  console.log('Message sent: %s', info.messageId);
}


// Call the function using an async IIFE
(async () => {
  
  const food = await fetchMealsFromSite();
  console.log(food);
  const password = readFileSyncToString(PW_FILE)
  const emails = readFileSyncToString(EMAIL_FILE).split("\n")
  const body = composeEmailBody(food)
  await sendEmail(body, emails, password).catch(console.error);

})();

