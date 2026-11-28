// Ponto de entrada: carregado por index.html para importar e inicializar os módulos.
// Por ora só inicializa a página inicial, o módulo Guide.
import { ViewModule } from "./view.js";
import { GuideModule } from "./guide/guide.js";

ViewModule.init()
GuideModule.init()
