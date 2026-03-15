import { exec } from 'child_process'

import { promisify } from 'util';
import fs from 'fs';
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec)

var IS_TEST = process.argv[3] == 'test'
console.log("############## " + new Date().toISOString() + " ##############")

try {
    var CONFIG  = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
} catch (error) {
    console.log(error)
    process.exit(0)
}

index()

async function index() {
    let file = process.argv[2]

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

    let mvCommand = `mv "${file}" "${CONFIG.mainFolder}${serieConfig.destFolder}"`

    if (IS_TEST) {
        console.log("comando de crear carpeta: " + checkFolderCommand)
        console.log("comando de mv : " + mvCommand)
        return
    }

    let mvResult = await execPromise(mvCommand)
    if (mvResult.stderr) {
        console.log(mvResult.stderr)
        return
    }

    if (mvResult.stdout) {
        console.log(mvResult.stdout)
    }

    console.log("- " + new Date().toISOString() + " movido " + file + " ---> " + serieConfig.destFolder)
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

