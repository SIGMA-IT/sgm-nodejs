sgm-nodejs
==========

Percolator + JS-HAL + Mongoose/MongoDB

Install
=======

Como todo proyecto NODEJS, para hacer uso dle mismo es necesario instalar el conjunto de paquetes NODE que se necesitan.
Estos se definen en tools/package.json

instalacion de modulos nodejs:

    var/www/sgm-nodejs/tools# npm install

Tools & Services
================

 - raw2hal: convierte los datos del formato csv(raw) a json(hal)

los datos de los archivos raw se alojan en tools/test/data/raw. Este archivo es un .sh que invoca a 3 procesos intermedios: 
raw -> csv, csv -> json, json -> hal

ejemplo de llamada en consola (linux):

    var/www/sgm-nodejs/service# ./raw2hal

 - server.js: levanta un servicio que sirve hals, y los permite navegar via links.

recibe como parametros:

 - -i: --input <path>',  'input dir to find json data [./data/json]',String,'./data/json'
 - -t: --transforms <transforms.json>','linking and embeding transforms [./transforms.json]',String,'./transforms.json'
 - -p: --port <8000>','port [8000]',Number,8000

ejemplo de llamada en consola (linux):

    var/www/sgm-nodejs/service# node server.js -p 3003 -i ../tools/test/data/json -t ../tools/test/specs/transforms.json

luego se puede navegar desde el browser desde la siguiente URL:

    http://trabajando:3003/api/data/nombre_entidad


Mappings & Transforms
=====================

 - mapppings.json: es el archivo donde se definen los campos para los conjuntos de datos csv a transformar a hal

convenciones:

 - fields: atributos donde se definen los pares nombre_campo_salida/nombre_campo_salida

Los datos deben estan entre comillas dobles (""), separados por comas(","). 
En caso de no existir algun valor entre las comas, se asignará NULL como valor pode defecto.

 - transforms.json: es el archivo donde se definen las relaciones entre los conjuntos de datos csv que se reflejaran en los archivos hal (conjunto salida)

convenciones:

- "storage":    "name": nombre del archivo .csv input


- "associations":   
 
 - "type": tipo de relacion, has-many/belongs-to
 - "target":nombre de la entidad que se relaciona "name"
 - "target_key":campo clave de la relacion "name_key"
 - "template":template de busqueda "{+base}{/path}{/id}/name_access"
 - "embeded":definicion de como se incluirá en el conjunto de datos, partial(permite n-1 niveles de embedded) o single(1 nivel de embedded)
  







