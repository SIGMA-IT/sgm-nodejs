# SGM-nodejs

Percolator + JS-HAL + Mongoose/MongoDB

## Install

Como todo proyecto NODEJS, para hacer uso del mismo es necesario instalar el conjunto de paquetes NODE que se necesitan.
Estos se definen en tools/package.json y en service/package.json

### Instalación de modulos nodejs:
 
> DIR\_RAIZ_PROYECTO/tools# npm install

> DIR\_RAIZ_PROYECTO/service# npm install

## Tools & Services

### raw2hal

> Convierte los datos del formato csv(raw) a json(hal)

> El archivo raw2hal es un .sh que invoca a 3 procesos intermedios: 
> > 1.  raw -> csv donde se convierten los csv crudos en csv sanitizados.
> > 2.  csv -> json donde se convierten los csv en json. 
> > 3.  json -> hal donde se convierten los json en HAL.

> Ejemplo de llamada en consola (linux):

> > DIR\_RAIZ_PROYECTO/service# ./raw2hal

### server.js

> Levanta un servicio que sirve hals, y los permite navegar via links (url).

> Este servicio utiliza un archivo de configuración "config.js" de donde obtiene los valores por defecto para poder realizar una conección y servirse de los mappings y transforms necesarios.

> También soporta la recepeción de parámetros por linea de consola a la hora de levantar el servicio. 

> - -i: --input <path>, directorio de entrada para los archivos json
> > <code>[./data/json]',String,'./data/json'</code>
> - -t: --transforms <transforms.json>, ubicacion del archivo transform.json
> > <code>[./transforms.json]',String,'./transforms.json'</code>
> - -m: --mappings <mappings.json>, ubicacion del archivo mappings.json
> > <code>[./mappings.json]',String,'./mappings.json'</code>
> - -p: --port <8000>', puerto a utilizar en la coneccion
> > <code> 'port [3003]', Number, 3003</code>

Ejemplo de llamada en consola (linux):

> > DIR\_RAIZ_PROYECTO/service# node server.js -p 3003 -i test/data/json -t test/specs/transforms.json -m test/specs/mappings.json

Una ves que el servicio este en ejecucion se podra acceder a los HAL generados mediante el navegador.

Ejemplo de navegacion

> > http://trabajando:3003/api/data/personas (donde personas es el nombre de la entidad)


# Mappings & Transforms

- <b>mapppings.json</b>: es el archivo donde se definen los campos de las entidades

> Convenciones:

> - fields: atributos donde se definen los pares "nombre_campo_salida":"nombre_campo_entrada"

> Los datos deben estan entre comillas dobles (""), separados por comas(","). 

> En caso de no existir algun valor entre las comas, se asignará NULL como valor pode defecto.

- <b>transforms.json</b>: es el archivo donde se definen las relaciones entre entidades

> convenciones:

> - storage: define el lugar donde se encuentra el archivo de entrada (input csv) 

> > - name: nombre del archivo .csv input

> - associations: define las asociaciones entre los csv de entrada, su tipo y la forma en la que se relacionan.  

> > - type: define el tipo de relacion

> > - target: nombre de la entidad que se relaciona

> > - through: nombre de la entidad por la cual se relaciona

> > - target_key :campo clave de la relacion "name_key"

> > - embedded: tipo de embedded dentro del hal

> > - linked: tipo de links dentro del hal

> > - template : template de busqueda "{+base}{/path}{/id}/name_access"

## Tipos de Relaciones

> Se ofrece soporte para las siguientes relaciones

> > 1. belongs-to
> > 2. has-one
> > 3. has-many
> > 4. has-one\:through
> > 5. has-many\:through
> > 6. is-a

> Cada una de estas relaciones son definidas dentro de la associations de cada entidad. A su vez, cada una de ellas tiene campos obligatorios y opcionales.

> # belongs-to

> > Requiere:

> > > - type : belongs-to
> > > - target: entidad a la que pertenece
> > > - key: clave con la que se relaciona a dicha entidad target (Tabla: la clave se encuentra dentro de la entidad)

> > Optional:

> > > - target\_key: clave en la entidad target que se relaciona con la entidad. 

> > Ejemplo:

> > > Supongamos que tenemos una entidad turno, turno esta asociado a un doctor en particular. Definimos dentro de la entidad turnos una asociacion del tipo <i>belongs-to</i> y la llamamos doctor.

> > >	```json
			//mapping
			{
				"turnos":
				{
					"fields":
					{
						"id": "ID"
					,	"id_doctor":"ID_DOCTOR"
					...
					}
				}
			,	"doctors"
				{
					"fields":
					{
						"id":"ID"
					,	"nombre":"NOMBRE"
					...
					}
				}
			}
			// transform
			"turnos":
			{
				...
			,	"associations":
				{
					"doctor":
					{
						"type":"belongs-to"
					,	"target":"doctors"
					,	"key": "id_doctor"
					}
				...
				}
			}
		```

> # has-one

> > Requiere:

> > > - type : has-one
> > > - target: entidad que contiene
> > > - target\_key: clave con la que se relaciona a dicha entidad (Tabla: la clave se encuentra en la entidad target)

> > Optional:

> > > - key: clave en la entidad que se relaciona con la entidad target

> > Ejemplo:

> > > Supongamos que tenemos una entidad login la cual contiene un mensage de bievenida a los usuarios. Definimos una asociacion dentro de la entidad de login del tipo <i>has-one</i> llamada welcome.

> > >	```json
			//mappings
			{
				"login":
				{
					"fields":
					{
						"id":"ID"
					,	"id_welcome":"ID_WELCOME"
					}
				}
			,	"welcome":
				{
					"fields":
					{
						"id":"ID"
					,	"msg":"MSG"
					}
				}
			}
			//transforms
			"login":
			{
				...
				"associations":
				{
					"welcome":
					{
						"type":"has-one"
					,	"target":"welcome"
					,	"target_key":"id_welcome"
					}
					...
				}
			}
		```

> # has-many

> > Requiere:

> > > - type : has-many
> > > - target: entidad que contiene
> > > - target\_key: clave con la que se relaciona a dichas entidades (Tabla: la clave se encuentra en la entidad que contiene)

> > Optional:

> > > - key: clave en la entidad que se relaciona con la entidad target

> > Ejemplo:

> > > Supongamos que tenemos una entidad provincias la cual contiene una relacion con instituciones del tipo <i>has-many</i>. Definimos una asociacion dentro de provincias llamada instituciones.

> > >	```json
			//mappings
			{
				"provincias":
				{
					"fields":
					{
						"id":"ID"
					,	"provincia":"PROVINCIA"
					}
				}
			,	"instituciones":
				{
					"fields":
					{
						"id":"ID"
					,	"id_provincia":"ID_PROVINCIA"
					,	"institucion":"INSTITUCION"
					}
				}
			}
			//transforms
			"provincias":
			{
				...
				"associations":
				{
					"instituciones":
					{
						"type":"has-many"
					,	"target":"instituciones"
					,	"target_key":"id_provincia"
					}
				}
			}
		```

> # has-one:through

> > Requiere:

> > > - type : has-one:through
> > > - through: entidad intermediaria
> > > - target: entidad final

> > Ejemplo:

> > > Supongamos que tenemos un video club, cada socio del video club, va a tener asociado un historial de peliculas alquiladas. Ahora bien si qusieramos saber que dia alquile la pelicula Campanita, tendriamos que definir una asociacion del tipo <i>has-one:through</i> en socio, llamemosla pelicula.

> > > ```json
			//mappings
			{
				"socio":
				{
					"fields":
					{
						"id":"ID"
					,	"nombre":"NOMBRe"
					}
				}
			,	"historial":
				{
					"fields":
					{
						"id":"ID"
					,	"id_socio":"ID_SOCIO"
					,	"id_pelicula":"ID_PELICULA"
					}
				}
			,	"peliculas":
				{
					"fields":
					{
						"id":"ID"
					,	"nombre":"NOMBRE"
					}
				}
			}
			//transforms
			"socio":
			{
				...
				"associations":
				{
					"pelicula":
					{
						"type":"has-one:through"
					,	"through":"historial"
					,	"target":"peliculas"
					}	
				}
			}
		```

> # has-many:through

> > Requiere:

> > > - type : has-many:through
> > > - through: entidad intermediaria
> > > - target: entidad final

> > Ejemplo:

> > > Supongamos que en un hospital se asignan un turno a un paciente y que cada turno tambien tiene un doctor asignado. Si quisieramos saber que pacientes va a atender un doctor segun los turnos asignados, tendriamos que definir una asociacion del tipo <i>has-many:through</i> en doctor, llamemosla pacientes.

> > > 	```json
			//mappings
			{
				"doctors":
				{
					"fields":
					{
						"id":"ID"
					,	"nombre":"NOMBRE"
					}
				}
			,	"turnos":
				{
					"fields":
					{
						"id":"ID"
					,	"id_paciente":"ID_PACIENTE"
					,	"id_doctor":"ID_DOCTOR"
					}
				}
			,	"paciente":
				{
					"field":
					{
						"id":"ID"
					,	"nombre":"NOMBRE"
					}
				}
			}
			//transforms
			"doctors":
			{
				...
				"associations":
				{
					"pacientes":
					{
						"type":"has-many:through"
					,	"through":"turnos"
					,	"target":"pacientes"
					}	
				}
			}
		```

> # is-a

> > Requiere:

> > > - type : is-a
> > > - target: entidad final

> > Optional:

> > > - key: clave en la entidad que se relaciona con la entidad padre
> > > - target\_key: clave en la entidad padre que se relaciona con la entidad. 

> > Ejemplo:

> > > Supongamos que tenemos una entidad Mascotas la cual tiene entidades "hijas". Llamemoslas Perros y Loros.

> > > 	```json
			//mappings
			{
				"animales":
				{
					"fields":
					{
						"id":"ID"
					,	"nombre":"NOMBRE"
					}
				}
			,	"domesticos":
				{
					"fields":
					{
						"id_animal":"id_animal"
					,	"nombre":"NOMBRE"
					,	"id_dueño":"id_dueño"
					}
				}
			}
			//transforms
			"domesticos":
			{
				...
				"associations":
				{
					"animales":
					{
						"type":"is-a"
					,	"target":"animales"
					}	
				}
			}
		```

## Embeddeds

> ### Tipos de Embeddeds

> > - none : define que no se incluira ningun embedded en la entidad (Si no se establece el campo embedded, por defecto se tomara none)

> > - single: define que existe un embedded, pero este nuevo recurso embebido no contendra nuevos embeddeds, solamente sus links

> > - partial: define que existe un embedded y este sera completo (incluye tanto links como embeddeds)

> ### Propiedades los Embeddeds

> > - type: define el tipo de embedded (none,single,partial)

> > - collection: si existe una coleccion y como sera

> ### Colecciones

> > - type: define el tipo de coleccion (en caso de estar vacio, por defecto se tomara list)

> > - ipp: define la cantidad de items por paginas a mostrar

> > - current\_page: define la pagina desde la que se comenzara a mostrar (por defecto 1)

> > #### Tipo de Collecciones

> > > - list: coleccion sin indices, ni siguientes, ni anteriores, solo una lista de recursos

> > > - pageable: coleccion paginable, contiene los links <i>next</i> y <i>prev</i>

> > > - scrollable: coleccion que contiene un unico link <i>more</i> 

## Links

> ### Atributos de Links

> > - type: define el tipo de links

> > - target: entidad de la que se obtendra el recurso. Esto permite generar un link que apunte a una nueva entidad.

> > - target\_key: en caso de estar definido target, se necesitara la clave que une ambas entidades

> > - target\_attr: define que atributos de la entidad se usaran en el link. Solamente se permitiran ['name', 'hreflang', 'title', 'templated','icon','align']

> ### Tipos de Links

> > - none: define que dado una coleccion el link solo apuntara a la coleccion completa.

> > - single: define que dado una coleccion el link solo apuntara a la coleccion completa.

> > - nested: define que dada una coleccion se creara un link por cada uno de sus elementos pero todas bajo un mismo rel.

# Servicio REST

El servicio generado por este proyecto es un servicio REST FULL, se utilizan los metodos GET, POST, PUT y DELETE para acceder, editar, crear y borrar recursos. Sin embargo, si utilizamos este servicio unicamente conectado con los csv y no con algun backend real (SQL, MongoDB), las modificaciones realizadas caducaran junto al servicio, es decir, si eliminamos un recurso, este no se vera reflejado se reiniciamos el servicio.

> ## GET

> > Solo basta con acceder a una url para obtener los datos. Sin embargo, se puede pasar datos vias url para filtrar la busqueda del GET. Una utilidad de este metodo es para la generacion de collections, donde pasamos via url, a parte de la peticion de la entidad, parametros de filtros propios de la collecion (type, ipp, current_page - VER COLLECTIONS PARA MAS DETALLE)

> > Ejemplo

> > > - Peticion simple, se devuelve un unico recurso

> > > 	```json
			GET http://trabajando:3003/api/data/personas/1

> > > - Peticion compuesta, se devuelve una coleccion

> > > 	```json
			GET http://trabajando:3003/api/data/personas

> > > - Peticion compuesta filtrada, se devuelve una coleccion

> > > 	```json
			GET http://trabajando:3003/api/data/personas?ipp=10&page=1&type=pageable

> ## POST

> > Se accede a una url y se pasan atributos mediante el body. Si el body llega vacio se procedera como si fuese un <i>GET</i>, si la url es simple y el body no esta vacio, se procedera como si fuese una modificacion de un recurso existente y si la peticion es compuesta y el body no esta vacio la peticion serea un filtro.

> > Ejemplo

> > > - Peticion Simple sin body

> > > 	```json
			//	Peticion
			POST http://trabajando:3003/api/data/personas/1 
			//	Body
			body: {}

> > > - Peticion simple con body

> > >	```json
			//	Peticion
			POST http://trabajando:3003/api/data/personas/1
			//	Body
			body:
			{
				nombre: 'OTRO NOMBRE'
			}

> > > - Peticion compuesta con body

> > > 	```json
			//	Peticion
			POST http://trabajando:3003/api/data/personas
			//	Body
			body:
			{
				nombre: 'Un nombre para filtrar'
			}

> ## PUT

> > Se accede a una url compuesta y se agrega un nuevo recurso. La url debe ser compuesta, body debe llegar con un prototipo del nuevo recurso a guardar y los datos correspondientes al nuevo recurso.

> > Ejemplo

> > > - Se crea un nuevo recurso persona

> > > 	```json
			//	Peticion
			PUT http://trabajando:3003/api/data/personas
			//	Body
			body:
			{
				nombre: 'unnombre'
			,	apellido: 'unapellido'
			,	telefono: 'untelefono'
			}

> ## DELETE

> > Se accede a una url simple y se elimina el recurso. La url debe ser simple.

> > Ejemplo

> > > - Se elimina un recurso de persona

> > > 	```json
			//	Peticion
			DELETE http://trabajando:3003/api/data/personas/1

# Store

> El Store es el intermediario entre el servicio y el backend. Analiza la peticion y en conjunto con el transform.json y la descripcion de las relaciones del mismo devuelve una query que el backend debe entender y devuelve los datos obtenidos segun dicha query.

> Este utiliza 5 metodos:

> > - Find: es la funcion encargada de devolver la data asociada a una peticion simple. Recibe dos argumentos: 

> > > find(what,filter) --> {object}

> > > Ejemplos: 

> > > > Supongamos las siguientes relaciones establecidas en los mappings y transforms

> > > > ```json
			//mappings
			{
				"personas":
				{
					"fields":
					{
						"id":"ID"
					,	"nombre":"NOMBRE"
					,	"id_ciudad":"ID_CIUDAD"
					}
				}
			,	"ciudads":
				{
					"fields":
					{
						"id":"ID"
					,	"nombre":"NOMBRE"
					,	"id_privincia":"ID_PROVINCIA"
					}
				}
			,	"provincias":
				{
					"field":
					{
						"id":"ID"
					,	"nombre":"NOMBRE"
					}
				}
			}
			//transforms
			"personas":
			{
				...
				"associations":
				{
					"ciudad":
					{
						"type":"belongs-to"
					,	"target":"ciudad"
					,	"key":"id_ciudad"
					}
				,	"provincia":
					{
						"type":"belongs-to:through"
					,	"target":"provincias"
					,	"through":"ciudads"
					}
				}
			}
			"ciudads":
			{
				...
				"associations":
				{
					"provincia":
					{
						"type":"belongs-to"
					,	"target":"provincia"
					,	"key":"id_provincia"
					}
				}
			}
			"provincias":
			{
				...
				"personas":
				{
					"type":"has-one:through"
				,	"target":"provincias"
				,	"through":"ciudads"
				}
			}
		```

> > > > 1. Buscamos la ciudad cuya id sea 12

> > > >	```javaScript
			find(
				"ciudades"
			,	{
					"key":"id"
				,	"value": "12"
				}
			)
		```

> > > > 2. Buscamos la Ciudad a la que pertenece la persona cuya id es 2

> > > >	```javaScript
			find(
				"ciudades"
			,	{
					source: 'personas',
				,	source_key: 'id',
				,	source_value: '2',
				,	key: 'id_ciudad',
				,	target_key: 'id'
				}
			)
		```

> > > > 3. Buscamos la Provincia a la que pertenece la persona cuya id es 2 a travez de su ciudad.

> > > >	```javaScript
			find(
				"provincias"
			,	{
					source: 'personas',
				,	source_key: 'id',
				,	source_value: '2',
				,	through:
					[
						{
							target: 'provincias'
						,	key: 'id_provincia'
						,	target_key: 'id'
						}
					]
				,	key: 'id',
				,	target_key: 'id'
				}
			)
		```

> > > > Nomenclatura General del Metodo Find

> > > >	```javaScript	
			what {string} // nombre de la entidad a buscar

			filter {object} // parametros necesario para la busqueda

			filter:
			{
			    through: [{array}],
			    source: [{string}],
			    source_key: {string},
			    source_value: {string},
			    key: {string},
			    target_key: {string}
			}
		```
> > - Filter

> > - Update

> > - Create

> > - Delete.