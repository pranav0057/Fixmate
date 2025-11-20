export function calculatePasswordStrength(password) {
  if (!password) return { label: "Very Weak" };

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const length = password.length;

  let score = 0;

  // Length contribution (only 6 and 8)
  if (length >= 6) score += 20;
  if (length >= 8) score += 20;

  // Character variety contribution
  if (hasLower) score += 20;
  if (hasUpper) score += 20;
  if (hasNumber) score += 20;

  // Assign label based on score and special criteria for Very Strong
  let label = "Very Weak";
  if (score < 30) label = "Very Weak";
  else if (score < 50) label = "Weak";
  else if (score < 70) label = "Fair";
  else if (score < 90) label = "Good";
  else if (score <= 100) label = "Strong";

  // Override to Very Strong only if all criteria are met
  if (length >= 8 && hasLower && hasUpper && hasNumber && hasSpecial) {
    label = "Very Strong";
  }
  return { label };
}
