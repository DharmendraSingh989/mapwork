import { Router } from "express";
import * as mapController from "../controllers/mapController.js";
import * as annotationController from "../controllers/annotationController.js";
import * as shareController from "../controllers/shareController.js";
import { handleMergeMaps } from "../controllers/mergeController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  MapCreateSchema,
  MapUpdateSchema,
  AnnotationCreateSchema,
  AnnotationUpdateSchema,
  BatchAnnotationOperationSchema,
  ShareCreateSchema,
  MergeMapsSchema
} from "@mapforge/shared";

const router = Router();

// Static routes FIRST before dynamic /:mapId!
router.post("/merge", requireAuth, validateBody(MergeMapsSchema), handleMergeMaps);

// Maps CRUD
router.get("/", requireAuth, mapController.listMaps);
router.post("/", requireAuth, validateBody(MapCreateSchema), mapController.createMap);
router.get("/:mapId", requireAuth, mapController.getMap);
router.patch("/:mapId", requireAuth, validateBody(MapUpdateSchema), mapController.updateMap);
router.delete("/:mapId", requireAuth, mapController.deleteMap);
router.post("/:mapId/duplicate", requireAuth, mapController.duplicateMap);

// Annotations under map
router.get("/:mapId/annotations", requireAuth, annotationController.listAnnotations);
router.post("/:mapId/annotations", requireAuth, validateBody(AnnotationCreateSchema), annotationController.createAnnotation);
router.post("/:mapId/annotations/batch", requireAuth, validateBody(BatchAnnotationOperationSchema), annotationController.batchAnnotations);
router.patch("/:mapId/annotations/:annotationId", requireAuth, validateBody(AnnotationUpdateSchema), annotationController.updateAnnotation);
router.delete("/:mapId/annotations/:annotationId", requireAuth, annotationController.deleteAnnotation);

// Sharing under map
router.post("/:mapId/shares", requireAuth, validateBody(ShareCreateSchema), shareController.createShareLink);
router.get("/:mapId/shares", requireAuth, shareController.getMapShares);

export default router;
