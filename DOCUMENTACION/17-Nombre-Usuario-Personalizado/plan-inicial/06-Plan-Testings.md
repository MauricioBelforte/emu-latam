# 06 - Plan de Testings - Nombre de Usuario Personalizado

## Pruebas Unitarias
- [ ] Modal se renderiza correctamente al primer inicio
- [ ] Input acepta nombre válido (3-20 chars alfanumérico)
- [ ] Input rechaza nombre vacío (botón deshabilitado)
- [ ] Input rechaza nombre > 20 caracteres
- [ ] localStorage guarda y recupera el nombre correctamente

## Pruebas de Integración
- [ ] Al confirmar nombre, el header lo muestra inmediatamente
- [ ] Al confirmar nombre, el sidebar lo muestra
- [ ] Al reiniciar app, el nombre persiste y el modal NO aparece

## Casos Límite
- [ ] localStorage corrompido o con valor inválido → mostrar modal
- [ ] Nombre con espacios al inicio/final → se trimea
- [ ] Caracteres especiales → se filtran o rechazan

## Resultados de Ejecución
- [ ] Todas las pruebas unitarias pasaron
- [ ] Todas las pruebas de integración pasaron
- [ ] Todos los casos límite pasaron

## Fecha de Ejecución: [YYYY-MM-DD]
## Estado: PENDIENTE
