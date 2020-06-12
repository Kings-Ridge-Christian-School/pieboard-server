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
		expect(response.body).toStrictEqual({"authentication": null, "id": 1, "ip": null, "lastSuccess": null, "manifest": null, "name": "Device 1", "port": 3030, "slideshows": []});
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
		expect(response2.body).toStrictEqual({"authentication": "password", "id": 1, "ip": "localhost", "lastSuccess": null, "manifest": null, "name": "TESTDEVICE", "port": 9999, "slideshows": []});
	
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

describe("Testing the PieBoard slideshow API", () => {
	it("Adding a slideshow", async () => {
		const response = await supertest(app).post('/api/slideshow/new');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});
	});
	it("Reading slideshow list", async () => {
		const response = await supertest(app).get('/api/slideshows');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual([{"id": 1, "name": "Slideshow 1"}]);
	});
	it("Reading slideshow settings", async () => {
		const response = await supertest(app).get('/api/slideshow/1');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"info": {"expire": 0, "id": 1, "name": "Slideshow 1"}, "slides": []});
	});
	it("Setting slideshow settings", async () => {
		const response = await supertest(app).post('/api/slideshow/edit').send({
			name: "TESTSHOW",
			expire: new Date("1000-01-01 1:00:00"),
			id: 1
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/slideshow/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"info": {"expire": "1000-01-01T05:56:02.000Z", "id": 1, "name": "TESTSHOW"}, "slides": []});
	
	});

	it("Deleting a slideshow", async () => {
		const response = await supertest(app).post('/api/slideshow/delete').send({
			id: 1
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/slideshow/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"error": true});
	});
});

describe("Testing the PieBoard slide API", () => {
	it("Adding a slideshow (need a show for a slide)", async () => {
		const response = await supertest(app).post('/api/slideshow/new');
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});
	});
	
	it("Adding a new slide", async () => {
		const response = await supertest(app).post('/api/slide/new').send({
			member: 1,
			name: "TESTSLIDE1",
			data: "TESTDATA0",
			thumbnail: "TESTDATA1"
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/slideshow/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"info": {"expire": 0, "id": 1, "name": "Slideshow 1"}, "slides": [{"data": "TESTDATA1", "hash": "16da82cabd13052d06c2e5befadb5eff", "id": 1, "member": 1, "name": "TESTSLIDE1", "position": 0, "screentime": 10}]});
	});
	it("Adding a second slide", async () => {
		const response = await supertest(app).post('/api/slide/new').send({
			member: 1,
			name: "TESTSLIDE2",
			data: "TESTDATA3",
			thumbnail: "TESTDATA4"
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/slideshow/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"info": {"expire": 0, "id": 1, "name": "Slideshow 1"}, "slides": [{"data": "TESTDATA1", "hash": "16da82cabd13052d06c2e5befadb5eff", "id": 1, "member": 1, "name": "TESTSLIDE1", "position": 0, "screentime": 10}, {"data": "TESTDATA4", "hash": "91c5519e29c140c7b864c5ae530080ec", "id": 2, "member": 1, "name": "TESTSLIDE2", "position": 1, "screentime": 10}]});
	});

	it("Adding a third slide", async () => {
		const response = await supertest(app).post('/api/slide/new').send({
			member: 1,
			name: "TESTSLIDE3",
			data: "TESTDATA5",
			thumbnail: "TESTDATA6"
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});
		
		const response2 = await supertest(app).get('/api/slideshow/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"info": {"expire": 0, "id": 1, "name": "Slideshow 1"}, "slides": [{"data": "TESTDATA1", "hash": "16da82cabd13052d06c2e5befadb5eff", "id": 1, "member": 1, "name": "TESTSLIDE1", "position": 0, "screentime": 10}, {"data": "TESTDATA4", "hash": "91c5519e29c140c7b864c5ae530080ec", "id": 2, "member": 1, "name": "TESTSLIDE2", "position": 1, "screentime": 10}, {"data": "TESTDATA6", "hash": "0ce7c69a765c43dce7200ab7f23a4245", "id": 3, "member": 1, "name": "TESTSLIDE3", "position": 2, "screentime": 10}]});
	
	});

	it("Moving slide 2 to 0", async () => {
		const response = await supertest(app).post('/api/slide/move').send({
			slideshow: 1,
			originalPos: 2,
			newPos: 0
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/slideshow/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"info": {"expire": 0, "id": 1, "name": "Slideshow 1"}, "slides": [{"data": "TESTDATA6", "hash": "0ce7c69a765c43dce7200ab7f23a4245", "id": 3, "member": 1, "name": "TESTSLIDE3", "position": 0, "screentime": 10}, {"data": "TESTDATA1", "hash": "16da82cabd13052d06c2e5befadb5eff", "id": 1, "member": 1, "name": "TESTSLIDE1", "position": 1, "screentime": 10}, {"data": "TESTDATA4", "hash": "91c5519e29c140c7b864c5ae530080ec", "id": 2, "member": 1, "name": "TESTSLIDE2", "position": 2, "screentime": 10}]});
	});

	it("Moving slide 0 to 2", async () => {
		const response = await supertest(app).post('/api/slide/move').send({
			slideshow: 1,
			originalPos: 0,
			newPos: 2
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/slideshow/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"info": {"expire": 0, "id": 1, "name": "Slideshow 1"}, "slides": [{"data": "TESTDATA1", "hash": "16da82cabd13052d06c2e5befadb5eff", "id": 1, "member": 1, "name": "TESTSLIDE1", "position": 0, "screentime": 10}, {"data": "TESTDATA4", "hash": "91c5519e29c140c7b864c5ae530080ec", "id": 2, "member": 1, "name": "TESTSLIDE2", "position": 1, "screentime": 10}, {"data": "TESTDATA6", "hash": "0ce7c69a765c43dce7200ab7f23a4245", "id": 3, "member": 1, "name": "TESTSLIDE3", "position": 2, "screentime": 10}]});
	});

	it("Deleting a slide", async () => {
		const response = await supertest(app).post('/api/slide/delete').send({
			id: 1
		});
		expect(response.status).toBe(200);
		expect(response.body).toStrictEqual({"error": false});

		const response2 = await supertest(app).get('/api/slide/get/1');
		expect(response2.status).toBe(200);
		expect(response2.body).toStrictEqual({"error": true});

		const response3 = await supertest(app).get('/api/slideshow/1');
		expect(response3.status).toBe(200);
		expect(response3.body).toStrictEqual( {"info": {"expire": 0, "id": 1, "name": "Slideshow 1"}, "slides": [{"data": "TESTDATA4", "hash": "91c5519e29c140c7b864c5ae530080ec", "id": 2, "member": 1, "name": "TESTSLIDE2", "position": 1, "screentime": 10}, {"data": "TESTDATA6", "hash": "0ce7c69a765c43dce7200ab7f23a4245", "id": 3, "member": 1, "name": "TESTSLIDE3", "position": 2, "screentime": 10}]});
	});
});

afterAll(done => {
    app.close();
    done();
});