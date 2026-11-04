import { servicios } from '../server/firebase-admin.mjs';
import { endpoint } from '../server/http.mjs';
import { usuarios } from '../server/usuarios.mjs';
export default endpoint((req, body) => usuarios(req, body, servicios()));
