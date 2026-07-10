"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleController = void 0;
class ExampleController {
    static async getAll(_req, res) {
        res.status(200).json({
            success: true,
            data: [],
            message: 'Retrieved all examples',
        });
    }
    static async getById(req, res) {
        const { id } = req.params;
        res.status(200).json({
            success: true,
            data: { id },
            message: `Retrieved example with id ${id}`,
        });
    }
    static async create(req, res) {
        const body = req.body;
        res.status(201).json({
            success: true,
            data: body,
            message: 'Example created successfully',
        });
    }
    static async update(req, res) {
        const { id } = req.params;
        const body = req.body;
        res.status(200).json({
            success: true,
            data: { id, ...body },
            message: `Example with id ${id} updated successfully`,
        });
    }
    static async delete(req, res) {
        const { id } = req.params;
        res.status(200).json({
            success: true,
            data: null,
            message: `Example with id ${id} deleted successfully`,
        });
    }
}
exports.ExampleController = ExampleController;
//# sourceMappingURL=example.controller.js.map