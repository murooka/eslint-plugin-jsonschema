import fs          from "fs"
import jsonpointer from "jsonpointer"

function iterateDirectory(dir, cb) {
  const paths = fs.readdirSync(dir);
  for (let path of paths) {
    path = `${dir}/${path}`;
    const stat = fs.statSync(path);
    if (stat.isDirectory()) {
      iterateDirectory(path, cb);
    } else {
      cb(path);
    }
  }
}

class RefContext {
  constructor() {
    this.cached = false;
    this.schemaMap = {};
  }
  resolveDirs(contextDirectories) {
    if (this.cached) return
    this.cached = true;

    const files = [];
    for (const dir of contextDirectories) {
      iterateDirectory(dir, file => {
        // TODO: ext options?
        if (!file.match(/\.json/)) return;

        files.push(file);
      });
    }

    for (const file of files) {
      let schema;
      try {
        schema = JSON.parse(fs.readFileSync(file));
      } catch (e) {
        // skip
        continue;
      }

      let id = schema.id;
      if (!id) continue;

      [id] = id.split("#");

      this.schemaMap[id] = schema;
    }
  }
  resolve(context) {

    let contextDirectory =
      context.settings &&
      context.settings["jsonschema"] &&
      context.settings["jsonschema"]["schemaDirectory"];
    if (!contextDirectory) {
      contextDirectory = [ "." ];
    }
    if (typeof contextDirectory === "string") {
      contextDirectory = [ contextDirectory ];
    }

    this.resolveDirs(contextDirectory);
  }
  contains(context, ref) {
    this.resolve(context);

    const [id = "", pointer = ""] = ref.split("#");
    const schema = this.schemaMap[id];
    if (!schema) return false;

    return jsonpointer.get(schema, pointer) !== undefined;
  }
}


export default new RefContext();
