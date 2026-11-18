import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('documentación interactiva de la API', () => {
  it('sirve Swagger UI y el contrato OpenAPI desde el backend', async () => {
    const page = await request(app).get('/api-docs/');
    expect(page.status).toBe(200);
    expect(page.text).toContain('swagger-ui-bundle.js');

    const bundle = await request(app).get('/api-docs/swagger-ui-bundle.js');
    expect(bundle.status).toBe(200);
    expect(bundle.headers['content-type']).toContain('javascript');

    const initializer = await request(app).get('/api-docs/swagger-ui-init.js');
    expect(initializer.status).toBe(200);
    expect(initializer.text).toContain('/api-docs/openapi.yaml');

    const specification = await request(app).get('/api-docs/openapi.yaml');
    expect(specification.status).toBe(200);
    expect(specification.headers['content-type']).toContain('application/yaml');
    expect(specification.text).toContain('openapi: 3.1.0');
    expect(specification.text).toContain('/quotations/{id}/pdf');
  });
});
