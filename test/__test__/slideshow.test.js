const supertest = require('supertest');
const app = require('../../app');

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

afterAll(done => {
    app.close();
    done();
});