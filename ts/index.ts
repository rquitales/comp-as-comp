import { componentProviderHost } from "./lib/provider";
import {SelfSignedCertificate} from "./selfSignedCert";

componentProviderHost(__dirname, { SelfSignedCertificate });
