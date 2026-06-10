ALTER TABLE "accommodations" ADD COLUMN "phone" VARCHAR(30);

-- Seed phone numbers extracted from production descriptions.
-- Each UPDATE targets a specific row by UUID; rows that do not exist (e.g. on local)
-- produce zero affected rows and are silently ignored.
UPDATE "accommodations" SET "phone" = '05198/210'               WHERE "id" = '893b764f-7c63-4989-9263-d72f44e8065a';
UPDATE "accommodations" SET "phone" = '+39 339 242 8928'        WHERE "id" = 'adfb4cd4-53eb-4ec4-8d2f-fc01e277319c';
UPDATE "accommodations" SET "phone" = '03581/649588'            WHERE "id" = '11c67fdd-5756-4945-af33-a2bb1a5782c0';
UPDATE "accommodations" SET "phone" = '+49 5191 16357'          WHERE "id" = '3352acd6-e603-4399-a4ad-6094e67bb0dc';
UPDATE "accommodations" SET "phone" = '03691/260185'            WHERE "id" = '59170fcf-a172-4ac0-9183-d1876a3dbf01';
UPDATE "accommodations" SET "phone" = '+49 5162/2274'           WHERE "id" = 'a00102a9-e556-4cc9-8f98-e32f579fe7dd';
UPDATE "accommodations" SET "phone" = '0541/318-0'              WHERE "id" = '8dc05524-04c1-47c9-9601-17a9dc6bbabf';
UPDATE "accommodations" SET "phone" = '+49 (0) 3621 75 85 29'   WHERE "id" = 'f8f3a8b4-6191-4b6b-9c8a-91d457a4334e';
UPDATE "accommodations" SET "phone" = '036921/96404'            WHERE "id" = '72f56ff5-5ef6-4bd8-86d6-13ca8a9bda98';
UPDATE "accommodations" SET "phone" = '05167/970 145'           WHERE "id" = 'a7296846-e241-4a2d-a766-2d1526ab98fd';
UPDATE "accommodations" SET "phone" = '+49 15233990346'         WHERE "id" = 'aa3a2a36-85a6-4e4a-9272-0a383c6a6fba';
UPDATE "accommodations" SET "phone" = '0151-46263244'           WHERE "id" = '18b59ffc-ef05-46a2-a9ec-c4bee90eaca0';
UPDATE "accommodations" SET "phone" = '0162-8835263'            WHERE "id" = 'ec26337d-5f6d-4dc5-80b7-079804677758';
UPDATE "accommodations" SET "phone" = '+49 4105 2023'           WHERE "id" = '84c33abb-e8c4-4ddb-b9d8-97f8107d1971';
UPDATE "accommodations" SET "phone" = '05191/98020'             WHERE "id" = '0a0d64d0-2588-409d-b7d9-8b97f870cca2';
UPDATE "accommodations" SET "phone" = '05161/6070'              WHERE "id" = '5cec9fb0-9fb2-4c06-b372-cc3aece1a157';
UPDATE "accommodations" SET "phone" = '05071/8080'              WHERE "id" = 'a15b6adb-0053-46e5-b1e0-0210c8c90fe8';
UPDATE "accommodations" SET "phone" = '03691-743259'            WHERE "id" = 'b180d554-762d-4fa2-b306-03fb61477dad';
UPDATE "accommodations" SET "phone" = '03591 40347'             WHERE "id" = '6500bbde-a905-472b-a6c9-e8e4f29bbc4a';
UPDATE "accommodations" SET "phone" = '05193/1249'              WHERE "id" = '53db09be-c3fb-4508-87f3-1f27a7c6b551';
UPDATE "accommodations" SET "phone" = '04189/282'               WHERE "id" = 'dca56416-1a5d-458b-9c92-6e0f5dbe1be2';
UPDATE "accommodations" SET "phone" = '05034/879990'            WHERE "id" = '58d92676-153d-4eab-b00c-1231990dfe16';
UPDATE "accommodations" SET "phone" = '+49 151 54 39 76 88'     WHERE "id" = '34a36cb8-8700-4ccb-ad2e-5caee5ce0911';
UPDATE "accommodations" SET "phone" = '05198/98980'             WHERE "id" = '8ea94fc9-a174-414b-ac09-3a01bf375976';
UPDATE "accommodations" SET "phone" = '+49 4941 056 1250'       WHERE "id" = '99a57227-fe6e-4c23-9dfa-d9bef9440b01';
UPDATE "accommodations" SET "phone" = '05822/94108-10'          WHERE "id" = '45cd6a3a-d3c1-4457-a457-d01ffadc7753';
UPDATE "accommodations" SET "phone" = '04184/7181'              WHERE "id" = '4d335742-4e06-482f-9bbc-53a9a391a1fc';
UPDATE "accommodations" SET "phone" = '0152-27110276'           WHERE "id" = '19bc607a-f3b4-40fc-9d41-d7ad49292943';
UPDATE "accommodations" SET "phone" = '01520-8750078'           WHERE "id" = '8ed9ef1d-a445-48e2-b42e-2c8207b06040';
UPDATE "accommodations" SET "phone" = '03591 31180'             WHERE "id" = '9f33b13a-0aed-4676-b3f0-6bc43c7d68f9';
UPDATE "accommodations" SET "phone" = '+49 5191 13313'          WHERE "id" = '197b8ccf-f968-4d9b-af64-8056028f16d7';
