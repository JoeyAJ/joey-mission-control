import json,sys
from jsonschema.validators import validator_for
from jsonschema import FormatChecker
p=json.load(sys.stdin)
def local_refs(v):
 if isinstance(v,dict):
  if '$ref' in v and not str(v['$ref']).startswith('#/'):raise ValueError('External refs disabled')
  for x in v.values():local_refs(x)
 elif isinstance(v,list):
  for x in v:local_refs(x)
try:
 local_refs(p['schema']);cls=validator_for(p['schema']);cls.check_schema(p['schema']);errors=list(cls(p['schema'],format_checker=FormatChecker()).iter_errors(p['data']))
 print(json.dumps({'valid':not errors,'rules':sorted(set(str(e.validator) for e in errors))}))
except Exception:
 print(json.dumps({'valid':False,'rules':['schema_unavailable_or_unsupported']}))
