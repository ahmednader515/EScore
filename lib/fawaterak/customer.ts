type FawaterakCustomerInput = {
  fullName: string;
  phoneNumber: string;
};

export type FawaterakCustomer = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
};

export function buildFawaterakCustomer(user: FawaterakCustomerInput): FawaterakCustomer {
  const parts = user.fullName.trim().split(/\s+/);
  const first_name = parts[0] || "User";
  const last_name = parts.slice(1).join(" ") || "-";
  const sanitizedPhone = user.phoneNumber.replace(/\D/g, "") || "0000000000";

  return {
    first_name,
    last_name,
    email: `${sanitizedPhone}@users.escore.app`,
    phone: user.phoneNumber,
    address: "Egypt",
  };
}
