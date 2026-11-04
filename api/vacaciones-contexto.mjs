import { servicios } from '../server/firebase-admin.mjs';
import { endpoint } from '../server/http.mjs';
import { vacacionesContexto } from '../server/vacaciones-contexto.mjs';
export default endpoint((req, body) => vacacionesContexto(req, body, servicios()));
