// validators/userValidator.js

function validateUserInput(body, files) {
  const requiredFields = [
    "name",
    "email",
    "password",
    "role",
    "phone_number",
    "address",
    "bank_name",
    "account_number",
    "ifsc_code"
  ];

  const missingFields = requiredFields.filter((field) => !body[field]);

  if (!files?.aadhar_card?.[0]) {
    missingFields.push("aadhar_card");
  }
  if (!files?.pan_card?.[0]) {
    missingFields.push("pan_card");
  }

  return missingFields;
}

module.exports = { validateUserInput };
