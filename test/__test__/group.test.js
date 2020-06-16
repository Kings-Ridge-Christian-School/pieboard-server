const supertest = require('supertest');
const app = require('../../app');

describe("Testing the PieBoard group API", () => {
	it("Adding a slideshow and device (needed for test)", async () => {
		const response = await supertest(app).post('/api/slideshow/new');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});
		const response2 = await supertest(app).post('/api/device/new');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"error": false});
	});
	it("Adding a group", async () => {
		const response = await supertest(app).post('/api/group/new');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});
	});
	it("Reading group list", async () => {
		const response = await supertest(app).get('/api/groups');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual([{"id": 1, "name": "Group 1"}]);
	});
	it("Reading group settings", async () => {
		const response = await supertest(app).get('/api/group/1');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"devices": [{"devgroup": null, "id": 1, "name": "Device 1"}], "id": 1, "name": "Group 1", "slideshows": "[]"});
	});
	it("Editing group settings", async () => {
		const response = await supertest(app).post('/api/group/edit').send({
			name: "TESTGROUP",
			id: 1,
			slideshows: [0],
			devices: [1]
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/group/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"devices": [{"devgroup": 1, "id": 1, "name": "Device 1"}], "id": 1, "name": "TESTGROUP", "slideshows": "[0]"});
	});

	it("Deleting a group", async () => {
		const response = await supertest(app).post('/api/group/delete').send({
			id: 1
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/group/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"error": true});

		const response3 = await supertest(app).get('/api/device/1');
		expect(response3.status).toBe(200);
		expect(response3.body.devgroup).toBe(null);
	});
});
afterAll(done => {
    app.close();
    done();
});