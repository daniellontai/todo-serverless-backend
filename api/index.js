require('dotenv').config()
const { PrismaClient } = require('@prisma/client');
const express = require('express');
const prisma = new PrismaClient();
const path = require("path");

const ERROR_CODE_DESCRIPTION_NOT_SET = 1;
const ERROR_CODE_COMPLETE_NOT_SET = 2;
const ERROR_CODE_UNEXPECTED_TYPE = 3;
const ERROR_CODE_DBCONN_FAILED = 4;

app = express();
app.use(express.json());
//serve react static build or node fallback
app.use(express.static(path.join(__dirname, "..", "build")));
app.use(express.static("public"));

// Add headers before the routes are defined
app.use(function (req, res, next) {
    // Cache control for Vercel
    res.setHeader('Cache-Control', 's-max-age=3600, stale-while-revalidate');

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5000');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get('/api', (req, res) => {
    res.sendStatus(400);
})

app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await prisma.task.findMany({
            orderBy: {
                id: 'asc',
            }
        });
        res.json(tasks);
    } catch (error) {
        sendPrismaErrorResponse(res, {code: ERROR_CODE_DBCONN_FAILED, message: "Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct."});
    }
})

app.post('/api/task', async (req, res) => {
    const {description, complete} = req.body;
    
    let errors = [];
    if (typeof description !== "string") {
        errors.push({code: ERROR_CODE_DESCRIPTION_NOT_SET, message: "description not set (expected String)"});
    }
    if (typeof complete !== 'boolean') {
        errors.push({code: ERROR_CODE_COMPLETE_NOT_SET, message: "complete not set (expected Boolean)"});
    }
    if (errors.length > 0) {
        sendBadDataErrorResponse(res, errors);
        return;
    }

    else {
        try {
            const create = await prisma.task.create({
                data: {
                    description,
                    complete
                }
            });
            res.json(create);
        } catch (error) {
            sendPrismaErrorResponse(res, {code: ERROR_CODE_DBCONN_FAILED, message: "Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct."});
        }
    }
})

app.get('/api/task/:id', async (req, res) => {
    let id = parseInt(req.params.id);

    if (!Number.isInteger(id)) {
        sendBadDataErrorResponse(res, {code: ERROR_CODE_UNEXPECTED_TYPE, message: 'id error (expected Int)'});
        return;
    }
    try {
        const task = await prisma.task.findFirst({
            where: {
                id: id
            }
        });
        res.json(task);
    } catch (error) {
        sendPrismaErrorResponse(res, {code: ERROR_CODE_DBCONN_FAILED, message: "Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct."});
    }
})

app.patch('/api/task/:id', async (req, res) => {
    let id = parseInt(req.params.id);
    let {description, complete} = req.body;

    if (!Number.isInteger(id)) {
        sendBadDataErrorResponse(res, {code: ERROR_CODE_UNEXPECTED_TYPE, message: 'id error (expected Int)'});
    }else {
        let data = {};
        data.id = id;
        if (typeof description === "string") {
            data.description = description;
        }
        if (typeof complete === "boolean") {
            data.complete = complete;
        }

        try {
            const update = await prisma.task.update({
                data,
                where: {
                    id:id
                }
            });
            res.json(update);
        } catch (error) {
            sendPrismaErrorResponse(res, error);
        }
    }
})

app.delete('/api/task/:id', async (req, res) => {
    let id = parseInt(req.params.id);

    if (!Number.isInteger(id)) {
        sendBadDataErrorResponse(res, {code: ERROR_CODE_UNEXPECTED_TYPE, message: 'id error (expected Int)'});
    }else {
        try {
            const deleteTask = await prisma.task.delete({
                where: {
                    id: id
                }
            });
            res.json(deleteTask);
        } catch (error) {
            sendPrismaErrorResponse(res, {code: ERROR_CODE_DBCONN_FAILED, message: "Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct."});
        }
    }
})

// app.listen(process.env.NODE_PORT || 3000, () => {
//     console.log(`Application listening on port ${process.env.NODE_PORT || 3000}`)
// })

console.log(app);
module.exports = app;


function sendErrorResponse(response, error, statusCode) {
    let errorToSend;
    if (typeof error == 'object') {
        errorToSend = [error];
    } else if (Array.isArray(error)) {
        errorToSend = error;
    }
    response.status(statusCode).send({error: errorToSend});
}

function sendPrismaErrorResponse(response, error) {
    sendErrorResponse(response, error, 500);
}

function sendBadDataErrorResponse(response, error) {
    sendErrorResponse(response, error, 400);
}