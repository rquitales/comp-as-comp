import { componentProviderHost } from "pulumi-ts-provider";
import {SelfSignedCertificate} from "./selfSignedCert";

componentProviderHost(__dirname, { SelfSignedCertificate });
