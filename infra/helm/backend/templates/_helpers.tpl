{{- /*
Hi-Hired Backend Helm helpers
*/ -}}

{{- define "hi-hired-backend.name" -}}
{{- default "hi-hired-backend" .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "hi-hired-backend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default "hi-hired-backend" .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "hi-hired-backend.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "hi-hired-backend.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "hi-hired-backend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "hi-hired-backend.labels" -}}
helm.sh/chart: {{ include "hi-hired-backend.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
