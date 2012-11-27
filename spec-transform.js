(
	function(exports)
	{
		exports.make_transformers
		=	function(_,store,spec)
			{
			var	results={}
				_.each(
					spec
				,	function(source_transform,index)
					{
						results[index]
						=	function(what)
							{
							var	transformed
							=	_.clone(what)
							,	transformers
							=	_.reduce(
									source_transform
								,	function(result,field_t,key)
									{
									var	make_transformer
									=	function(field)
										{
										var	is_single
										=	field.key!=undefined
										,	is_linked
										=	field.linked!=undefined
										,	src
										=	index
										,	src_key
										=	is_single
												?field.key
												:'id'
										,	tgt
										=	is_linked
												?field.linked
												:field.embeded
										,	tgt_key
										=	is_linked
												?field.linked_key
												:field.embeded_key
										return	function(source_item,transform_key)
											{
											var	embed_single
											=	function()
												{
												return	store.find(tgt,tgt_key,source_item[src_key])
												}
											,	embed_list
											=	function()
												{
												return	store.filter(tgt,tgt_key,source_item[src_key])
												}
											,	link_single
											=	function()
												{
												return	{href:tgt+'/'+what[src_key]}
												}
												source_item[transform_key]
												=	is_single
													?is_linked
														?link_single()
														:embed_single()
													:embed_list()
											}
										}
										result[key]=make_transformer(field_t)
									return	result
									}
								,	{}
								)
								_.each(
									transformers
								,	function(t,k)
									{
										t(transformed,k)
									}
								)
							return	transformed
							}
					}
				)
			return	results
			}

	}
)(
	typeof exports === 'undefined'
		?this['spec_transform']={}
		:exports
)
