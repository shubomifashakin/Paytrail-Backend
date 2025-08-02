import { Resend } from "resend";

import serverEnv from "../serverEnv";

const resend = new Resend(serverEnv.resend);

export default resend;
