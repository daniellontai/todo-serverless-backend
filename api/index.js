require('dotenv').config();
const { prisma } = require('../prisma/initDb.js');
const rateLimiterMiddleware = require('../middleware/rateLimiterPrisma.js');
const setHeadersMiddleware = require('../middleware/setHeaders.js');
const express = require('express');
const cors = require('cors');

const ERROR_CODE_DESCRIPTION_NOT_SET = 1;
const ERROR_CODE_COMPLETE_NOT_SET = 2;
const ERROR_CODE_UNEXPECTED_TYPE = 3;
const ERROR_CODE_DBCONN_FAILED = 4;

app = express();
app.disable('x-powered-by');

app.use(express.json());

// Add CORS
app.use(
	cors({
		//origin: /^https:\/\/todo-react-frontend-teal\.vercel\.app(\/.*)?$/,
		origin: 'http://localhost:3001',
		methods: 'GET,OPTIONS,PATCH,DELETE,POST',
		allowedHeaders: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
		credentials: true,
	})
);

// Add headers
app.use(setHeadersMiddleware);

// Add rate limiter with Postgres store
app.use(rateLimiterMiddleware);

app.get('/api', (req, res) => {
	res.sendStatus(400);
});

//deprecated route
/*app.get('/api/tasks', async (req, res) => {
	try {
		const tasks = await prisma.task.findMany({
			orderBy: {
				id: 'asc',
			},
			where: {
				listId: '0',
			},
		});
		res.json(tasks);
	} catch (error) {
		sendPrismaErrorResponse(res, {
			error: error,
			code: ERROR_CODE_DBCONN_FAILED,
			message: 'Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct.',
		});
	}
});*/

app.get('/api/lists', async (req, res) => {
	try {
		const lists = await prisma.list.findMany({
			orderBy: {
				createdAt: 'asc',
			},
		});
		res.json(lists);
	} catch (error) {
		sendPrismaErrorResponse(res, {
			error: error,
			code: ERROR_CODE_DBCONN_FAILED,
			message: 'Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct. [GET api/lists]',
		});
	}
});

app.post('/api/list', async (req, res) => {
	const { name } = req.body;
	if (typeof name !== 'string') {
		sendBadDataErrorResponse(res, { code: ERROR_CODE_UNEXPECTED_TYPE, message: 'name error (expected String) [POST api/list]' });
		return;
	}
	try {
		const list = await prisma.list.create({
			data: {
				name: name,
			},
		});
		res.json(list);
	} catch (error) {
		sendPrismaErrorResponse(res, {
			code: ERROR_CODE_DBCONN_FAILED,
			message: 'Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct. [POST api/list]',
			error: error,
		});
	}
});

app.get('/api/tasks/:list', async (req, res) => {
	let listId = req.params.list;

	if (!isValidCuid(listId)) {
		sendBadDataErrorResponse(res, {
			code: ERROR_CODE_UNEXPECTED_TYPE,
			message: 'listId error (expected cuid) [GET api/tasks/:list]',
		});
		return;
	}
	try {
		const tasks = await prisma.task.findMany({
			where: {
				listId: listId,
			},
		});
		res.json(tasks);
	} catch (error) {
		sendPrismaErrorResponse(res, {
			code: ERROR_CODE_DBCONN_FAILED,
			message: 'Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct. [GET api/tasks/:list]',
		});
	}
});

app.delete('/api/list/:id', async (req, res) => {
	if (!isValidCuid(req.params.id)) {
		sendBadDataErrorResponse(res, {
			code: ERROR_CODE_UNEXPECTED_TYPE,
			message: 'listId error (expected cuid) [DELETE api/list/:id]',
		});
		return;
	}
	try {
		const deleteTasks = await prisma.task.deleteMany({
			where: {
				listId: req.params.id,
			},
		});
		const deleteList = await prisma.list.delete({
			where: {
				id: req.params.id,
			},
		});
		res.json({ deleteList, deleteTasks });
	} catch (error) {
		console.log(error);
		sendPrismaErrorResponse(res, {
			code: ERROR_CODE_DBCONN_FAILED,
			message: 'Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct. [DELETE api/list/:id]',
		});
	}
});

app.patch('/api/list/:id', async (req, res) => {
	const { name } = req.body;
	console.log(name);
	if (!isValidCuid(req.params.id)) {
		sendBadDataErrorResponse(res, {
			code: ERROR_CODE_UNEXPECTED_TYPE,
			message: 'listId error (expected cuid) [PATCH api/list/:id]',
		});
		return;
	}
	if (typeof name !== 'string') {
		sendBadDataErrorResponse(res, { code: ERROR_CODE_UNEXPECTED_TYPE, message: 'name error (expected String) [PATCH api/list/:id]' });
		return;
	}
	try {
		const list = await prisma.list.update({
			where: {
				id: req.params.id,
			},
			data: {
				name: name,
			},
		});
		res.json(list);
	} catch (error) {
		sendPrismaErrorResponse(res, {
			code: ERROR_CODE_DBCONN_FAILED,
			message: 'Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct. [PATCH api/list/:id]',
		});
	}
});

app.post('/api/task', async (req, res) => {
	const { description, complete, listId } = req.body;

	let errors = [];
	if (typeof description !== 'string') {
		errors.push({ code: ERROR_CODE_DESCRIPTION_NOT_SET, message: 'description not set (expected String) [POST api/task]' });
	}
	if (typeof complete !== 'boolean') {
		errors.push({ code: ERROR_CODE_COMPLETE_NOT_SET, message: 'complete not set (expected Boolean) [POST api/task]' });
	}
	if (typeof listId !== 'string' || !isValidCuid(listId)) {
		errors.push({ code: ERROR_CODE_UNEXPECTED_TYPE, message: 'listId error (expected cuid.) [POST api/task]' });
	}
	if (errors.length > 0) {
		sendBadDataErrorResponse(res, errors);
		return;
	} else {
		try {
			const create = await prisma.task.create({
				data: {
					description,
					complete,
					listId,
				},
			});
			res.json(create);
		} catch (error) {
			sendPrismaErrorResponse(res, {
				code: ERROR_CODE_DBCONN_FAILED,
				message: 'Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct. [POST api/task]',
			});
		}
	}
});

app.get('/api/task/:id', async (req, res) => {
	let id = parseInt(req.params.id);

	if (!Number.isInteger(id)) {
		sendBadDataErrorResponse(res, { code: ERROR_CODE_UNEXPECTED_TYPE, message: 'id error (expected Int) [GET api/task/:id]' });
		return;
	}
	try {
		const task = await prisma.task.findFirst({
			where: {
				id: id,
			},
		});
		res.json(task);
	} catch (error) {
		sendPrismaErrorResponse(res, {
			code: ERROR_CODE_DBCONN_FAILED,
			message: 'Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct. [GET api/task/:id]',
		});
	}
});

app.patch('/api/task/:id', async (req, res) => {
	let id = parseInt(req.params.id);
	let { description, complete } = req.body;

	if (!Number.isInteger(id)) {
		sendBadDataErrorResponse(res, { code: ERROR_CODE_UNEXPECTED_TYPE, message: 'id error (expected Int) [PATCH api/task/:id]' });
	} else {
		let data = {};
		data.id = id;
		if (typeof description === 'string') {
			data.description = description;
		}
		if (typeof complete === 'boolean') {
			data.complete = complete;
		}

		try {
			const update = await prisma.task.update({
				data,
				where: {
					id: id,
				},
			});
			res.json(update);
		} catch (error) {
			sendPrismaErrorResponse(res, {
				code: ERROR_CODE_DBCONN_FAILED,
				message: 'Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct. [PATCH api/task/:id]',
			});
		}
	}
});

app.delete('/api/task/:id', async (req, res) => {
	let id = parseInt(req.params.id);

	if (!Number.isInteger(id)) {
		sendBadDataErrorResponse(res, { code: ERROR_CODE_UNEXPECTED_TYPE, message: 'id error (expected Int) [DELETE api/task/:id]' });
	} else {
		try {
			const deleteTask = await prisma.task.delete({
				where: {
					id: id,
				},
			});
			res.json(deleteTask);
		} catch (error) {
			sendPrismaErrorResponse(res, {
				code: ERROR_CODE_DBCONN_FAILED,
				message: 'Database connection unsuccessful. Please ensure that the database server is running and that the credentials are correct. [DELETE api/task/:id]',
			});
		}
	}
});

app.listen(process.env.NODE_PORT || 3000, () => {
	console.log(`Application listening on port ${process.env.NODE_PORT || 3000}`);
});

//console.log(app);
//module.exports = app;

function sendErrorResponse(response, error, statusCode) {
	let errorToSend;
	if (typeof error == 'object') {
		errorToSend = [error];
	} else if (Array.isArray(error)) {
		errorToSend = error;
	}
	response.status(statusCode).send({ error: errorToSend });
}

function sendPrismaErrorResponse(response, error) {
	sendErrorResponse(response, error, 500);
}

function sendBadDataErrorResponse(response, error) {
	sendErrorResponse(response, error, 400);
}

function isValidCuid(str) {
	return str.length > 0 && str.charAt(0) === 'c' && str.length >= 7;
}
