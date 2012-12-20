(
	function(exports)
	{
		exports.make_transformers
		=	function(_,hal,hal_builder,hal_collection_builder,uritemplate,assoc_transforms)
			{
			return	function(store,spec)
				{
					_(spec)
					.each(
						function(transform_spec,transform_entry)
						{
							_(transform_spec.api)
							.extend(
								{
									get_url:
										function(data)
										{
										return	uritemplate(this.templates.find_one)
											.expand(
												_(this.url)
												.extend(
													data
												)
											)
										}
								}
							)
							_(transform_spec.associations)
							.each(
								function(association,assoc_key)
								{
									association.source=transform_spec
									if(!_.isObject(spec[association['target']]))
										throw "ERROR: '"+transform_entry+"': invalid 'target' in '"+ assoc_key  +"' association"
									_(['target','through'])
									.each(
										function(what)
										{
											if( _.isString(association[what]) )
											{
												spec[association[what]].name=association[what]
												association[what]=spec[association[what]]
											}
										}
									)
									if( _.isString(association.embeded) )
										association.embeded={type:association.embeded}
									if(association.template)
										_(association)
										.extend(
											{
												get_link:
													function(data)
													{
													return	uritemplate(this.template)
														.expand(
															_(transform_spec.api.url)
															.extend(
																data
															)
														)
													}
											}
										)
								}
							)
						//console.log(transform_entry,transform_spec)
						}
					)
				function check_spec(spec)
				{
				var	visited
				=	[]
				var	_check
				=	function(t_spec)
					{
						visited.push(t_spec.name)
					var	all_ok
					=	_(t_spec.associations)
						.every(
							function(assoc,assoc_key)
							{
								if(	(!assoc.embeded)
								||	(assoc.embeded.type=='partial')
								)	return	true
								if(!_(visited).contains(assoc.target.name))
								return	_check(assoc.target)
								else
								{
									console.log(
										'referecia circular'
									,	{
											assoc:assoc_key
										,	source:assoc.source.name
										,	target:assoc.target.name
										}
									)
									return	false
								}
							}
						)
						visited.pop()
					return	all_ok
					}
				return	_(spec)
					.every(_check)
				}
				if(!check_spec(spec)) throw 'FATAL: errores en la spec'

				var	spec_transformers
				=	_.reduce(
						spec
					,	function(results,transform_spec,transform_entry)
						{
						//console.log(transform_entry,transform_spec)
						var	storage
						=	transform_spec.storage
						,	api
						=	transform_spec.api
						,	associations
						=	transform_spec.associations
							results[transform_entry]
							=	function(source_data,profile)
								{
								var prefix_to_discard
								=	'_'
								_.isObject(source_data)
								?(
									_.map(
										_.keys(source_data)
									,	function(field)
										{
											if(_.first(field)==prefix_to_discard){
												source_data=_.omit(source_data,field)
											}
										}
									)
								):false

								var	transformed
								=	new hal_builder(source_data,api.get_url(source_data))
								,	associations2
								=	(profile!='partial')
										?associations
										:_(associations)
										.reduce(
											function(result,assoc,assoc_key)
											{
												result[assoc_key]
												=	_.omit(assoc,'embeded')
											return	result
											}
										,	{}
										)
									_.each(
										associations2
									,	function(assoc_spec,assoc_key)
										{
											assoc_spec.name=assoc_key
											assoc_transforms(assoc_spec.type,store,spec_transformers)
											(assoc_spec)
											(source_data,transformed)
										}
									)
								return	transformed//.get_document()
								}
						return	results
						}
					,	{}
					)
				return	spec_transformers
				}
			}
	}
)(
	typeof exports === 'undefined'
		?this['Sigma'].portable
		:exports
)
