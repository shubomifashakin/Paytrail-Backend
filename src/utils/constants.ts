import { Currencies } from "@prisma/client";
import serverEnv from "../serverEnv";

export const FORCE_EXIT_TIMEOUT = 10000;

export type IpLocatorResponse = {
  ip: string;
  location: {
    continent_code: string;
    continent_name: string;
    country_code2: string;
    country_code3: string;
    country_name: string;
    country_name_official: string;
    country_capital: string;
    state_prov: string;
    state_code: string;
    district: string;
    city: string;
    zipcode: string;
    latitude: string;
    longitude: string;
    is_eu: false;
    country_flag: string;
    geoname_id: string;
    country_emoji: string;
  };
  country_metadata: {
    calling_code: string;
    tld: string;
    languages: string[];
  };
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
};

export enum MESSAGES {
  UNAUTHORIZED = "Unauthorized",
  FORBIDDEN = "Forbidden",
  NOT_FOUND = "Not Found",
  BAD_REQUEST = "Bad Request",
  INTERNAL_SERVER_ERROR = "Internal Server Error",
  SERVICE_UNAVAILABLE = "Service Unavailable",
  GATEWAY_TIMEOUT = "Gateway Timeout",
  REQUEST_TIMEOUT = "Request Timeout",
  TOO_MANY_REQUESTS = "Too Many Requests",
  SUCCESS = "Success",
  AI_GENERATION_ENDED = "AI Generation Did Not Complete",
  AI_GENERATION_WARNINGS = "AI Generation Warnings",
  AI_GENERATION_USAGE = "AI Generation Usage",
  AI_GENERATION_ERROR = "AI Generation Error",
  EMAIL_ERROR = "Email Error",
  FAILED_TO_DELETE_ENDPOINT_ARN = "Failed to delete endpoint",
  RESEND_ERROR = "RESEND ERROR",
  ACCOUNT_PENDING_DELETION = "Your account has been scheduled for deletion",
  ACCOUNT_DOES_NOT_EXIST = "Account does not exist",
  APPLE_SIGN_IN_ERROR = "AppleSignInError:",
  GOOGLE_SIGN_IN_ERROR = "Google Sign In Error",
  FETCH_FAILED = "Failed to fetch",
  CACHE_FAILURE = "Cache Error",
}

export const API_V1 = "/api/v1";
export const deleteDaysWindow = 14;

export const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OATH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REDIRECT_URL = `${serverEnv.baseUrl}${API_V1}/auth/google/callback`;

export const SESSION_EXPIRY = 60 * 60 * 24 * 7;

export const resendEmailFrom = "Paytrail <hello@notifications.paytrail.app>";
export const supportMail = "support@paytrail.app";

export const currencyData: Record<keyof typeof Currencies, { name: string; symbol: string }> = {
  USD: { name: "United States Dollar", symbol: "$" },
  NGN: { name: "Nigerian Naira", symbol: "₦" },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
  CAD: { name: "Canadian Dollar", symbol: "CA$" },
  AUD: { name: "Australian Dollar", symbol: "A$" },
  JPY: { name: "Japanese Yen", symbol: "¥" },
  CNY: { name: "Chinese Yuan", symbol: "¥" },
  INR: { name: "Indian Rupee", symbol: "₹" },
  ZAR: { name: "South African Rand", symbol: "ZAR" },
  GHS: { name: "Ghanaian Cedi", symbol: "₵" },
  KES: { name: "Kenyan Shilling", symbol: "KES" },
  EGP: { name: "Egyptian Pound", symbol: "£" },
  SAR: { name: "Saudi Riyal", symbol: "﷼" },
  AED: { name: "UAE Dirham", symbol: "د.إ" },
  TRY: { name: "Turkish Lira", symbol: "₺" },
  RUB: { name: "Russian Ruble", symbol: "₽" },
  CHF: { name: "Swiss Franc", symbol: "CHF" },
  SEK: { name: "Swedish Krona", symbol: "SEK" },
  NOK: { name: "Norwegian Krone", symbol: "NOK" },
  DKK: { name: "Danish Krone", symbol: "DKK" },
  SGD: { name: "Singapore Dollar", symbol: "S$" },
  NZD: { name: "New Zealand Dollar", symbol: "NZD" },
  MXN: { name: "Mexican Peso", symbol: "MEX$" },
  BRL: { name: "Brazilian Real", symbol: "R$" },
  ARS: { name: "Argentine Peso", symbol: "$" },
  CLP: { name: "Chilean Peso", symbol: "$" },
  COP: { name: "Colombian Peso", symbol: "COP" },
  PEN: { name: "Peruvian Sol", symbol: "S/" },
  KRW: { name: "South Korean Won", symbol: "₩" },
  THB: { name: "Thai Baht", symbol: "฿" },
  IDR: { name: "Indonesian Rupiah", symbol: "Rp" },
  PHP: { name: "Philippine Peso", symbol: "₱" },
  MYR: { name: "Malaysian Ringgit", symbol: "RM" },
  VND: { name: "Vietnamese Dong", symbol: "₫" },
  PKR: { name: "Pakistani Rupee", symbol: "₨" },
  BDT: { name: "Bangladeshi Taka", symbol: "৳" },
  QAR: { name: "Qatari Riyal", symbol: "﷼" },
  KWD: { name: "Kuwaiti Dinar", symbol: "د.ك" },
  OMR: { name: "Omani Rial", symbol: "﷼" },
  BHD: { name: "Bahraini Dinar", symbol: "ب.د" },
  JOD: { name: "Jordanian Dinar", symbol: "د.ا" },
  LBP: { name: "Lebanese Pound", symbol: "ل.ل" },
  IRR: { name: "Iranian Rial", symbol: "﷼" },
  BOB: { name: "Bolivian Boliviano", symbol: "BOB" },
  UYU: { name: "Uruguayan Peso", symbol: "$U" },
  PLN: { name: "Polish Złoty", symbol: "zł" },
  CZK: { name: "Czech Koruna", symbol: "Kč" },
  HUF: { name: "Hungarian Forint", symbol: "Ft" },
  ILS: { name: "Israeli New Shekel", symbol: "₪" },
  TZS: { name: "Tanzanian Shilling", symbol: "TZS" },
  UGX: { name: "Ugandan Shilling", symbol: "UGX" },
  DZD: { name: "Algerian Dinar", symbol: "دج" },
  MAD: { name: "Moroccan Dirham", symbol: "د.م." },
  TND: { name: "Tunisian Dinar", symbol: "د.ت" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$" },
  TWD: { name: "Taiwan Dollar", symbol: "NT$" },
  RON: { name: "Romanian Leu", symbol: "lei" },
  BGN: { name: "Bulgarian Lev", symbol: "лв" },
  HRK: { name: "Croatian Kuna", symbol: "kn" },
  RSD: { name: "Serbian Dinar", symbol: "дин." },
  UAH: { name: "Ukrainian Hryvnia", symbol: "₴" },
  BYN: { name: "Belarusian Ruble", symbol: "BYN" },
  KZT: { name: "Kazakhstani Tenge", symbol: "₸" },
  UZS: { name: "Uzbekistani Som", symbol: "soʻm" },
  KGS: { name: "Kyrgyzstani Som", symbol: "с" },
  TJS: { name: "Tajikistani Somoni", symbol: "ЅМ" },
  AFN: { name: "Afghan Afghani", symbol: "؋" },
  NPR: { name: "Nepalese Rupee", symbol: "₨" },
  LKR: { name: "Sri Lankan Rupee", symbol: "Rs" },
  MMK: { name: "Myanmar Kyat", symbol: "Ks" },
  KHR: { name: "Cambodian Riel", symbol: "៛" },
  LAK: { name: "Lao Kip", symbol: "₭" },
  MNT: { name: "Mongolian Tugrik", symbol: "₮" },
  MVR: { name: "Maldivian Rufiyaa", symbol: "Rf" },
  SCR: { name: "Seychellois Rupee", symbol: "₨" },
  MUR: { name: "Mauritian Rupee", symbol: "₨" },
  LSL: { name: "Lesotho Loti", symbol: "LSL" },
  NAD: { name: "Namibian Dollar", symbol: "N$" },
  BWP: { name: "Botswana Pula", symbol: "BWP" },
  ZMW: { name: "Zambian Kwacha", symbol: "ZK" },
  MWK: { name: "Malawian Kwacha", symbol: "MK" },
  AOA: { name: "Angolan Kwanza", symbol: "Kz" },
  CDF: { name: "Congolese Franc", symbol: "CDF" },
  XAF: { name: "Central African CFA Franc", symbol: "FCFA" },
  XOF: { name: "West African CFA Franc", symbol: "CFA" },
  XPF: { name: "CFP Franc", symbol: "₣" },
  XCD: { name: "East Caribbean Dollar", symbol: "EC$" },
  BBD: { name: "Barbadian Dollar", symbol: "BB$" },
  JMD: { name: "Jamaican Dollar", symbol: "J$" },
  TTD: { name: "Trinidad and Tobago Dollar", symbol: "TT$" },
  BZD: { name: "Belize Dollar", symbol: "BZ$" },
  GTQ: { name: "Guatemalan Quetzal", symbol: "GTQ" },
  HNL: { name: "Honduran Lempira", symbol: "HNL" },
  NIO: { name: "Nicaraguan Córdoba", symbol: "C$" },
  CRC: { name: "Costa Rican Colón", symbol: "₡" },
  GYD: { name: "Guyanese Dollar", symbol: "GY$" },
  SRD: { name: "Surinamese Dollar", symbol: "SUR$" },
  FJD: { name: "Fijian Dollar", symbol: "FJ$" },
  PGK: { name: "Papua New Guinean Kina", symbol: "PGK" },
  WST: { name: "Samoan Tālā", symbol: "WST" },
  TOP: { name: "Tongan Paʻanga", symbol: "T$" },
  SBD: { name: "Solomon Islands Dollar", symbol: "SI$" },
  TVD: { name: "Tuvaluan Dollar", symbol: "TV$" },
  HTG: { name: "Haitian Gourde", symbol: "HTG" },
  DOP: { name: "Dominican Peso", symbol: "RD$" },
  CUP: { name: "Cuban Peso", symbol: "CUP" },
  BMD: { name: "Bermudian Dollar", symbol: "BD$" },
  KYD: { name: "Cayman Islands Dollar", symbol: "KYD" },
  BIF: { name: "Burundian Franc", symbol: "FBu" },
  DJF: { name: "Djiboutian Franc", symbol: "DJF" },
  KMF: { name: "Comorian Franc", symbol: "CF" },
  RWF: { name: "Rwandan Franc", symbol: "FRw" },
  GMD: { name: "Gambian Dalasi", symbol: "GMD" },
  GNF: { name: "Guinean Franc", symbol: "FG" },
  ERN: { name: "Eritrean Nakfa", symbol: "ERN" },
  ETB: { name: "Ethiopian Birr", symbol: "ETB" },
  SOS: { name: "Somali Shilling", symbol: "SOS" },
  YER: { name: "Yemeni Rial", symbol: "﷼" },
  IQD: { name: "Iraqi Dinar", symbol: "ع.د" },
  SYP: { name: "Syrian Pound", symbol: "£" },
  LYD: { name: "Libyan Dinar", symbol: "ل.د" },
  SDG: { name: "Sudanese Pound", symbol: "ج.س." },
  SSP: { name: "South Sudanese Pound", symbol: "SSP" },
  CVE: { name: "Cape Verdean Escudo", symbol: "CVE" },
  BND: { name: "Brunei Dollar", symbol: "B$" },
};

export const dateTimeLocale = "en-GB";
