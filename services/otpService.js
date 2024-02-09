// const accountSid = "AC3d68b65c9868eb6b8edffada09bd57e1";
// const authToken = "8aba52b094c2a44ca2b4d34eeb534caf";
// const verifySid = "VA65b82ba5a2a6266ef8b9364383e365ad";
// const client = require("twilio")(accountSid, authToken);

module.exports = { sendOtpToPhone };
const { Vonage } = require('@vonage/server-sdk')

const vonage = new Vonage({
  apiKey: "9a9c2e52",
  apiSecret: "kcZ2FyvdXLp9M2uW"
})

async function sendOtpToPhone(phoneNumber, otp) {
  try {
  const from = "Instabook"
  const to = phoneNumber
  const text = `OTP : ${otp}`
  
  async function sendSMS() {
      await vonage.sms.send({to, from, text})
          .then(resp => { console.log('Message sent successfully'); console.log(resp); })
          .catch(err => { console.log('There was an error sending the messages.'); console.error(err); });
  }
  
  sendSMS();
  } catch (error) {
    console.error(`Error sending/verifying OTP: ${error.message}`);
    throw error;
  }
}
