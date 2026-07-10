"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleRouter = void 0;
const express_1 = require("express");
const example_controller_1 = require("../controllers/example.controller");
const exampleRouter = (0, express_1.Router)();
exports.exampleRouter = exampleRouter;
exampleRouter.get('/', example_controller_1.ExampleController.getAll);
exampleRouter.get('/:id', example_controller_1.ExampleController.getById);
exampleRouter.post('/', example_controller_1.ExampleController.create);
exampleRouter.put('/:id', example_controller_1.ExampleController.update);
exampleRouter.delete('/:id', example_controller_1.ExampleController.delete);
//# sourceMappingURL=example.routes.js.map