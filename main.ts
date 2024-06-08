'use-strict'
import nodemailer from "nodemailer";
import fs from 'fs';
import path from 'path';

const baseUrl = 'https://dmschools.api.nutrislice.com/menu/api/weeks/school/jess-franklin-taylor/menu-type/{lunchOrBreakfast}/{YYYY/MM/DD}'

const today = new Date()
const year = today.getFullYear().toString().padStart(2, "0")
const month = (today.getMonth()+1).toString().padStart(2, "0")
const day = today.getDate().toString().padStart(2, "0")
const dateUrlString = `${year}/${month}/${day}`
const dateCompareString = `${year}-${month}-${day}`
// https://dmschools.api.nutrislice.com/menu/api/weeks/school/jess-franklin-taylor/menu-type/lunch/2024/02/19/

const emailFile = path.join(__dirname, '../emails.txt');
const passwordFile = path.join(__dirname, '../password.txt');

type Meals = {
  breakfast: string[],
  lunch: string[]
}

async function fetchTodaysMeals():Promise<Meals> {
  const todaysFood:Meals = {
    'breakfast':[],
    'lunch':[]
  }
  
  for (const meal of Object.keys(todaysFood) as (keyof Meals)[]) {
    const url = baseUrl.replace('{YYYY/MM/DD}', dateUrlString).replace('{lunchOrBreakfast}', meal)
    console.log(`URL = ${url}`)
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
        if (day['date'] === dateCompareString){
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
 * Reads the contents of a file synchronously.
 * @param {string} filePath The path to the file.
 * @returns {string} The contents of the file.
 */
function readFileSyncToString(filePath:string) {
  try {
      // Synchronously read the file content
      const data = fs.readFileSync(filePath, { encoding: 'utf8' });
      return data;
  } catch (err) {
      console.error('Error reading file:', err);
      return ''; // or throw err; to propagate the error to the caller
  }
}

function createMealSentence(meals:Meals) {
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
  return `Today, Finn is having the following for breakfast:\n${breakfastList}\n\nFor lunch, he'll be having:\n${lunchList}`;
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
    subject: `Finn Food for ${dateCompareString}`, 
    text: body, // Plain text body
    // html: '<b>Hello world?</b>' // HTML body content
  };

  // Send the email
  let info = await transporter.sendMail(mailOptions);

  console.log('Message sent: %s', info.messageId);
}


// Call the function using an async IIFE
(async () => {
  
  const food = await fetchTodaysMeals();
  console.log(food);
  const password = readFileSyncToString(passwordFile)
  const emails = readFileSyncToString(emailFile).split("\n")
  const body = createMealSentence(food)
  await sendEmail(body, emails, password).catch(console.error);

})();

