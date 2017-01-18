SystemJS.config({
  "paths": {
    "example-bootstrap": "src/"
  },
  "map": {
    "bootstrap": "node_modules/bootstrap/dist",
    "jquery": "node_modules/jquery/dist"
  },
  "packages": {
    "node_modules/bootstrap/dist": {
      "main": "js/bootstrap.js",
      "format": "global",
      "deps": [
        "jquery"
      ],
      "exports": "$"
    },
    "node_modules/jquery/dist": {
      "main": "jquery.js"
    },
    "example-bootstrap": {
      "main": "index.js"
    }
  }
});