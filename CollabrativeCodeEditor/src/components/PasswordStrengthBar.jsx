import React from "react";
import { calculatePasswordStrength } from "../utils/passwordStrengthUtils";

export default function PasswordStrengthBar({ password }) {
  const { label } = calculatePasswordStrength(password);

  // Map label to both color and width
  const labelMap = {
    "Very Weak": { bar: "bg-red-500", text: "text-red-400", width: "10%" },
    "Weak": { bar: "bg-orange-500", text: "text-orange-400", width: "30%" },
    "Fair": { bar: "bg-yellow-500", text: "text-yellow-400", width: "50%" },
    "Good": { bar: "bg-blue-500", text: "text-blue-400", width: "70%" },
    "Strong": { bar: "bg-green-500", text: "text-green-400", width: "90%" },
    "Very Strong": { bar: "bg-indigo-500", text: "text-indigo-400", width: "100%" },
  };

  const { bar, text, width } = labelMap[label] || { bar: "bg-gray-500", text: "text-gray-400", width: "0%" };

  return (
    <div className="mt-2 flex items-center space-x-3">
      {/* Strength bar */}
      <div className="flex-1 h-2 rounded bg-gray-700 overflow-hidden">
        <div
          className={`h-2 rounded transition-all duration-300 ${bar}`}
          style={{ width }}
        ></div>
      </div>

      {/* Label */}
      <span className={`text-sm font-medium ${text}`}>
        {label}
      </span>
    </div>
  );
}
