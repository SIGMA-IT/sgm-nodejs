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


