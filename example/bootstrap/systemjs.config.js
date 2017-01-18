SystemJS.config({
  "paths": {
    "example-bootstrap": "src/"
  },
  "map": {
    "jquery": "node_modules/jquery/dist",
    "bootstrap": "node_modules/bootstrap/dist/js"
  },
  "packages": {
    "node_modules/jquery/dist": {
      "main": "jquery.js"
    },
    "node_modules/bootstrap/dist/js": {
      "main": "bootstrap.js",
      "format": "global",
      "deps": [
        "jquery"
      ],
      "exports": "$"
    },
    "example-bootstrap": {
      "main": "index.js"
    }
  }
});