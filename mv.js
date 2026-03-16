import { exec } from 'child_process'
import { promisify, parseArgs } from 'util';
import fs from 'fs';
import { dirname } from "path";
import { fileURLToPath } from "url";

const options = {
  test: { type: 'boolean' },
  command: { type: 'string' },
  help: { type: 'boolean' },
};

const { values, positionals } = parseArgs({ options, allowPositionals: true, strict: false, tokens: true });

if (values.help) {
    showMenu()
    process.exit(0)
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec)
var IS_TEST = values.test || false
var COMMAND = (values.command == 'mv') ? 'mv' : 'cp'
console.log("############## " + new Date().toISOString() + " ##############")

try {
    var CONFIG  = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
} catch (error) {
    console.log(error)
    process.exit(0)
}

index()

async function index() {
    let file = positionals[0]

    if (!file) {
        showMenu()
        return
    }

    let serieConfig = getDestFolder(file)

    if (!serieConfig) {
        return false
    }

    //crear la carpeta en el destino si no existe
    let checkFolderCommand = `mkdir -p "${CONFIG.mainFolder}${serieConfig.destFolder}"`
    if (!IS_TEST) {
        let cfResult = await execPromise(checkFolderCommand)
        if (cfResult.stderr) {
            console.log(cfResult.stderr)
            return
        }
    }

    // escapar las comillas para que no afecten al comando
    file = file.replaceAll(/(?<!\\)"/g, '\\"')

    // para el mv si no acaba con una / el archivo se renombra a el nombre de la carpeta
    if (!serieConfig.destFolder.endsWith('/')) {
        serieConfig.destFolder += '/'
    }

    let fullCommand = `${COMMAND} "${file}" "${CONFIG.mainFolder}${serieConfig.destFolder}"`

    if (IS_TEST) {
        console.log("comando de crear carpeta: " + checkFolderCommand)
        console.log(`comando de ${COMMAND}: ${fullCommand}`)
        return
    }

    let result = await execPromise(fullCommand)
    if (result.stderr) {
        console.log(result.stderr)
        return
    }

    if (result.stdout) {
        console.log(result.stdout)
    }

    console.log(`- ${new Date().toISOString()} ${COMMAND == 'mv' ? 'movido' : 'copiado'} ${file} ---> ${CONFIG.mainFolder}${serieConfig.destFolder}`)
}

/**
 * Muestra los pasos a seguir para usar el script
 */
function showMenu() {
    console.log("Como usar el script")
    console.log("1. Rellenar los datos del archivo config.json siguiendo el ejemplo")
    console.log("2. Pasar como parametro el archivo")
    console.log("   ej. node mv.js \"/descargas/One Punch Man Season 01 episode 1x01.mkv\"")
    console.log("Se comprobaran los titulos de config.json con el archivo para obtener la ruta del directorio destino")
    console.log("Se mueve el archivo a la ruta")
    console.log("Opciones:")
    console.log("  --test: Ejecutar en modo de prueba")
    console.log("  --command: Comando a ejecutar (mv o cp) default cp ej. --command=mv")
    console.log("  --help: Mostrar esta ayuda")
}

/**
 * Devuelve las rutas remota a la que se va a subir el archivo
 * @param   {string}    file    Archivo que se va a subir
 * @returns {Object}            Objeto con los datos de la serie guardados en config.json
 */
function getDestFolder(file) {
    let activeSeries = CONFIG.series.filter(e => e.active)
    let res = activeSeries.filter(serie => file.match(serie.title));

    if (!res.length) {
        console.log("- No se ha encontrado la carpeta de la serie correspondiente a " + file)
        return false
    }

    if (res.length > 1) {
        console.log("- Hay varias series que coinciden con el titulo indicado en la configuracion")
        return false
    }

    return res[0]
}

