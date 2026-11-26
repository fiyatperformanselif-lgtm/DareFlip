import configured from "./publisher.json";
import { validatePublisher } from "./publisher-schema";

const validation = validatePublisher(configured);
export const publisher = validation.publisher;
export const publisherReady = validation.issues.length === 0;
