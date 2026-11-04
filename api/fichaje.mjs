import { servicios } from '../server/firebase-admin.mjs';
import { endpoint } from '../server/http.mjs';
import { fichaje } from '../server/fichaje.mjs';
export default endpoint((req, body) => fichaje(req, body, servicios()));
