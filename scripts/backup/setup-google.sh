#!/usr/bin/env bash
# Owner-run in Google Cloud Shell. No key creation or billing changes.
set -euo pipefail
project=curiousity-lab
pool=curiosity-backup
provider=github-main
account=curiosity-backup-reader
service_account="$account@$project.iam.gserviceaccount.com"
condition="assertion.repository_id=='1413422857' && assertion.repository_owner_id=='10180929' && assertion.ref=='refs/heads/main' && assertion.workflow_ref=='spaceartisan/curiousity-lab/.github/workflows/backup-weekly.yml@refs/heads/main'"
mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id'
# Refuse billing-enabled projects. Failure to inspect billing also stops the script.
billing_enabled=$(gcloud billing projects describe "$project" --format='value(billingEnabled)')
if [[ "$billing_enabled" != False && "$billing_enabled" != false ]]; then
  echo 'Expected billing-disabled project; no configuration changed.' >&2
  exit 1
fi
project_number=$(gcloud projects describe "$project" --format='value(projectNumber)')
[[ "$project_number" =~ ^[0-9]+$ ]] || exit 1
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project="$project"
if ! gcloud iam service-accounts describe "$service_account" --project="$project" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$account" --project="$project" --display-name='Curiosity backup reader'
fi
gcloud projects add-iam-policy-binding "$project" --member="serviceAccount:$service_account" --role=roles/datastore.viewer --condition=None >/dev/null
if ! gcloud iam workload-identity-pools describe "$pool" --location=global --project="$project" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$pool" --location=global --project="$project" --display-name='Curiosity backups'
fi
expected_provider="projects/$project_number/locations/global/workloadIdentityPools/$pool/providers/$provider"
providers=$(gcloud iam workload-identity-pools providers list --workload-identity-pool="$pool" --location=global --project="$project" --format='value(name)')
[[ -z "$providers" || "$providers" == "$expected_provider" ]] || { echo 'Dedicated pool contains other providers; review before continuing.' >&2; exit 1; }
if gcloud iam workload-identity-pools providers describe "$provider" --workload-identity-pool="$pool" --location=global --project="$project" >/dev/null 2>&1; then
  # Do not silently weaken or alter a previously configured trust relationship.
  gcloud iam workload-identity-pools providers describe "$provider" --workload-identity-pool="$pool" --location=global --project="$project" --format=json | python3 -c 'import json,sys; p=json.load(sys.stdin); assert p.get("attributeCondition")==sys.argv[1] and p.get("attributeMapping")=={"google.subject":"assertion.sub","attribute.repository_id":"assertion.repository_id"} and p.get("oidc",{}).get("issuerUri")=="https://token.actions.githubusercontent.com" and not p.get("disabled",False), "Existing provider differs; review before continuing"' "$condition"
else
  gcloud iam workload-identity-pools providers create-oidc "$provider" --workload-identity-pool="$pool" --location=global --project="$project" --issuer-uri=https://token.actions.githubusercontent.com --attribute-mapping="$mapping" --attribute-condition="$condition"
fi
gcloud iam service-accounts add-iam-policy-binding "$service_account" --project="$project" --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/projects/$project_number/locations/global/workloadIdentityPools/$pool/attribute.repository_id/1413422857" >/dev/null
printf 'BACKUP_WIF_PROVIDER=projects/%s/locations/global/workloadIdentityPools/%s/providers/%s\n' "$project_number" "$pool" "$provider"
printf 'BACKUP_SERVICE_ACCOUNT=%s\n' "$service_account"
echo 'Configuration prepared. Verify effective read-only permissions and Spark status before enabling exports.'
