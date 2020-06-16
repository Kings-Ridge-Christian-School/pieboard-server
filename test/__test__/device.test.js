const supertest = require('supertest');
const app = require('../../app');

describe("Testing the PieBoard device API", () => {

	it("Adding a device", async () => {
		const response = await supertest(app).post('/api/device/new');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});
	});
	it("Reading device list", async () => {
		const response = await supertest(app).get('/api/devices');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual([{"id": 1, "name": "Device 1"}]);
	});
	it("Reading device settings", async () => {
		const response = await supertest(app).get('/api/device/1');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"authentication": null, "devgroup": null, "id": 1, "ip": null, "lastSuccess": null, "manifest": null, "name": "Device 1", "port": 3030, "slideshows": []});
	});
	it("Setting device settings", async () => {
		const response = await supertest(app).post('/api/device/edit').send({
			name: "TESTDEVICE",
			ip: "localhost",
			slideshows: [],
			authentication: "password",
			port: "9999",
			id: 1
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/device/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"authentication": "password", "devgroup": null, "id": 1, "ip": "localhost", "lastSuccess": null, "manifest": null, "name": "TESTDEVICE", "port": 9999, "slideshows": []});
	
	});

	it("Reading new device nonce", async () => {
		const response = await supertest(app).get('/api/device/getnonce/1');
		expect(response.status).toBe(200);
		expect(response.body.nonce.length).toBe(32);
	});
	it("Deleting a device", async () => {
		const response = await supertest(app).post('/api/device/delete').send({
			id: 1
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/device/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"error": true});
	});
});
afterAll(done => {
    app.close();
    done();
});