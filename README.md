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

> > - through_key: campo clave de la relacion en la entidad intermediaria

> > - through_target_key: campo clave de la relacion en la entidad final.

> > - embedded: tipo de embedded dentro del hal

> > - linked: tipo de links dentro del hal

> > - template : template de busqueda "{+base}{/path}{/id}/name_access"

## Tipos de Relaciones

> Se ofrece soporte para las siguientes relaciones

> > 1. belongs-to
> > 2. has-one
> > 3. has-many
> > 4. belongs-to\:through
> > 5. has-one\:through
> > 6. has-many\:through

> Cada una de estas relaciones son definidas dentro de la associations de cada entidad. A su vez, cada una de ellas tiene campos obligatorios y opcionales.

> # belongs-to

> > Requiere:

> > > - type : belongs-to
> > > - target: entidad a la que pertenece
> > > - key: clave con la que se relaciona a dicha entidad

> > Ejemplo:

> > > Supongamos que tenemos una entidad turno, turno esta asociado a un doctor en particular. Definimos dentro de la entidad turnos una asociacion del tipo <i>belongs-to</i> y la llamamos doctor.

> > > ```json
			"doctor":
			{
				"type":"belongs-to"
			,	"target":"doctors"
			,	"key": "id_doctor"
			}
	 ```

> # has-one

> > Requiere:

> > > - type : has-one
> > > - target: entidad que contiene
> > > - key: clave con la que se relaciona a dicha entidad

> > Ejemplo:

> > > Supongamos que tenemos una entidad login la cual contiene un mensage de bievenida a los usuarios. Definimos una asociacion dentro de la entidad de login del tipo <i>has-one</i> llamada welcome.

> > > ```json
			"welcome":
			{
				"type":"has-one"
			,	"target":"welcome"
			,	"key":"id_welcome"
			}
	```

> # has-many

> > Requiere:

> > > - type : has-many
> > > - target: entidad que contiene
> > > - target\_key: clave con la que se relaciona a dichas entidades

> > Ejemplo:

> > > Supongamos que tenemos una entidad provincias la cual contiene una relacion con instituciones del tipo <i>has-many</i>. Definimos una asociacion dentro de provincias llamada instituciones.

> > > ```json
			"instituciones":
			{
				"type":"has-many"
			,	"target":"instituciones"
			,	"target_key":"id_provincia"
			}
	```

> # belongs-to:through

> > Requiere:

> > > - type : belongs-to:through
> > > - through: entidad intermediaria
> > > - target: entidad final
> > > - through_key: clave que relaciona la entidad intermediaria con la final

> > Ejemplo:

> > > Supongamos que en el ambito escolar, un grupo de alumnos tendra un profesor segun el grado en el que se encuentre. Si el alumno pertenece al grupo A, tendra el profesor asociado al grupo A. Entonces dado un alumno cualquiera del grupo A, podemos encontrar su profesor. Para ello definimos una asociacion del tipo <i>belongs-to:through</i> dentro de la entidad alumno y la llamamos profesor.

> > > ```json
			"profesor":
			{
				"type":"belongs-to:through"
			,	"through":"grados"
			,	"target":"profesores"
			,	"through_key":"id_profesor_grado"
			}
	```

> # has-one:through

> > Requiere:

> > > - type : has-one:through
> > > - through: entidad intermediaria
> > > - target: entidad final
> > > - through_key: clave que relaciona la entidad intermediaria con la final

> > Ejemplo:

> > > Supongamos que tenemos un video club, cada socio del video club, va a tener asociado un historial de peliculas alquiladas. Ahora bien si qusieramos saber que dia alquile la pelicula Campanita, tendriamos que definir una asociacion del tipo <i>has-one:through</i> en socio, llamemosla pelicula.

> > > ```json
			"pelicula":
			{
				"type":"has-one:through"
			,	"through":"historial"
			,	"target":"peliculas"
			,	"through_key":"id_pelicula"
			}
	```

> # has-many:through

> > Requiere:

> > > - type : has-many:through
> > > - through: entidad intermediaria
> > > - target: entidad final
> > > - through\_key: clave que relaciona la entidad con la entidad intermediaria
> > > - through\_target_key: clave que relaciona la entidad intermediaria con la final

> > Ejemplo:

> > > Supongamos que en un hospital se asignan un turno a un paciente y que cada turno tambien tiene un doctor asignado. Si quisieramos saber que pacientes va a atender un doctor segun los turnos asignados, tendriamos que definir una asociacion del tipo <i>has-many:through</i> en doctor, llamemosla pacientes.

> > > ```json
			"pacientes":
			{
				"type":"has-many:through"
			,	"through":"turnos"
			,	"target":"pacientes"
			,	"through_key":"id_doctor"
			,	"through_target_key":"id_paciente"
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

```json
	GET http://trabajando:3003/api/data/personas/1
```

> > > - Peticion compuesta, se devuelve una coleccion

```json
	GET http://trabajando:3003/api/data/personas
```

> > > - Peticion compuesta filtrada, se devuelve una coleccion

```json
	GET http://trabajando:3003/api/data/personas?ipp=10&page=1&type=pageable
```

> ## POST

> > Se accede a una url y se pasan atributos mediante el body. Si el body llega vacio se procedera como si fuese un <i>GET</i>, si la url es simple y el body no esta vacio, se procedera como si fuese una modificacion de un recurso existente y si la peticion es compuesta y el body no esta vacio la peticion serea un filtro.

> > Ejemplo

> > > - Peticion Simple sin body

```json
	POST http://trabajando:3003/api/data/personas/1 -> GET http://trabajando:3003/api/data/personas/1
```

> > > - Peticion simple con body

```json
	POST http://trabajando:3003/api/data/personas/1

	body:
	{
		nombre: 'OTRO NOMBRE'
	}
```

> > > - Peticion compuesta con body

```json
	POST http://trabajando:3003/api/data/personas

	body:
	{
		nombre: 'Un nombre para filtrar'
	}
```

> ## PUT

> > Se accede a una url compuesta y se agrega un nuevo recurso. La url debe ser compuesta, body debe llegar con un prototipo del nuevo recurso a guardar y los datos correspondientes al nuevo recurso.

> > Ejemplo

> > > - Se crea un nuevo recurso persona

```json
	PUT http://trabajando:3003/api/data/personas

	body:
	{
		nombre: 'unnombre'
	,	apellido: 'unapellido'
	,	telefono: 'untelefono'
	}
```

> ## DELETE

> > Se accede a una url simple y se elimina el recurso. La url debe ser simple.

> > Ejemplo

> > > - Se elimina un recurso de persona

```json
	DELETE http://trabajando:3003/api/data/personas/1
```

# Store

> El Store es el intermediario entre el servicio y el backend. Analiza la peticion y en conjunto con el transform.json y la descripcion de las relaciones del mismo devuelve una query que el backend debe entender y devuelve los datos obtenidos segun dicha query.

> Este utiliza 5 metodos:

> > - Find: es la funcion encargada de devolver la data asociada a una peticion simple. Recibe dos argumentos: 

> > > 1. what (nombre de la entidad), por ejemplo, personas

> > > 2. filter (filtro a aplicar)

> > - Filter

> > - Update

> > - Create

> > - Delete.