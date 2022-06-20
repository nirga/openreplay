import { makeAutoObservable, runInAction, observable, action, reaction, computed } from "mobx"
import Widget, { IWidget } from "./types/widget";
import { metricService, errorService } from "App/services";
import { toast } from 'react-toastify';
import Error from "./types/error";

export interface IMetricStore {
    paginatedList: any;

    isLoading: boolean
    isSaving: boolean

    metrics: IWidget[]
    instance: IWidget

    page: number
    pageSize: number
    metricsSearch: string
    sort: any

    sessionsPage: number
    sessionsPageSize: number
    
    // State Actions
    init(metric?: IWidget|null): void
    updateKey(key: string, value: any): void
    merge(object: any): void
    reset(meitricId: string): void
    addToList(metric: IWidget): void
    updateInList(metric: IWidget): void
    findById(metricId: string): void
    removeById(metricId: string): void
    fetchError(errorId: string): Promise<any>

    // API
    save(metric: IWidget, dashboardId?: string): Promise<any>
    fetchList(): void
    fetch(metricId: string)
    delete(metric: IWidget)
}

export default class MetricStore implements IMetricStore {
    isLoading: boolean = false
    isSaving: boolean = false

    metrics: IWidget[] = []
    instance: IWidget = new Widget()

    page: number = 1
    pageSize: number = 15
    metricsSearch: string = ""
    sort: any = {}

    sessionsPage: number = 1
    sessionsPageSize: number = 10

    constructor() {
        makeAutoObservable(this, {
            isLoading: observable,
            metrics: observable,
            instance: observable,
            page: observable,
            pageSize: observable,
            metricsSearch: observable,
            sort: observable,

            init: action,
            updateKey: action,
            merge: action,
            reset: action,
            addToList: action,
            updateInList: action,
            findById: action,
            removeById: action,

            save: action,
            fetchList: action,
            fetch: action,
            delete: action,

            fetchError: action,

            paginatedList: computed,
        })
    }

    // State Actions
    init(metric?: IWidget|null) {
        // const _metric = new Widget().fromJson(sampleJsonErrors)
        // this.instance.update(metric || _metric)

        this.instance.update(metric || new Widget())
    }

    updateKey(key: string, value: any) {
        this[key] = value
    }

    merge(object: any) {
        Object.assign(this.instance, object)
    }

    reset(id: string) {
        const metric = this.findById(id)
        if (metric) {
            this.instance = metric
        }
    }

    addToList(metric: IWidget) {
        this.metrics.push(metric)
    }

    updateInList(metric: IWidget) {
        const index = this.metrics.findIndex((m: IWidget) => m[Widget.ID_KEY] === metric[Widget.ID_KEY])
        if (index >= 0) {
            this.metrics[index] = metric
        }
    }

    findById(id: string) {
        return this.metrics.find(m => m[Widget.ID_KEY] === id)
    }

    removeById(id: string): void {
        this.metrics = this.metrics.filter(m => m[Widget.ID_KEY] !== id)
    }

    get paginatedList(): IWidget[] {
        const start = (this.page - 1) * this.pageSize
        const end = start + this.pageSize
        return this.metrics.slice(start, end)
    }

    // API Communication
    save(metric: IWidget, dashboardId?: string): Promise<any> {
        const wasCreating = !metric.exists()
        this.isSaving = true
        return new Promise((resolve, reject) => {
            metricService.saveMetric(metric, dashboardId)
                .then((metric: any) => {
                    const _metric = new Widget().fromJson(metric)
                    if (wasCreating) {
                        toast.success('Metric created successfully')
                        this.addToList(_metric)
                        this.instance = _metric
                    } else {
                        toast.success('Metric updated successfully')
                        this.updateInList(_metric)
                    }
                    resolve(_metric)
                }).catch(() => {
                    toast.error('Error saving metric')
                    reject()
                }).finally(() => {
                    this.isSaving = false
                })
        })
    }

    fetchList() {
        this.isLoading = true
        return metricService.getMetrics()
            .then((metrics: any[]) => {
                this.metrics = metrics.map(m => new Widget().fromJson(m))
            }).finally(() => {
                this.isLoading = false
            })
    }

    fetch(id: string, period?: any) {
        this.isLoading = true
        return metricService.getMetric(id)
            .then((metric: any) => {
                // if (period) {
                //     metric.period = period
                // }
                return this.instance = new Widget().fromJson(metric, period)
            }).finally(() => {
                this.isLoading = false
            })
    }

    delete(metric: IWidget) {
        this.isSaving = true
        return metricService.deleteMetric(metric[Widget.ID_KEY])
            .then(() => {
                this.removeById(metric[Widget.ID_KEY])
                toast.success('Metric deleted successfully')
            }).finally(() => {
                this.isSaving = false
            })
    }

    fetchError(errorId: any): Promise<any> {
        return new Promise((resolve, reject) => {
            errorService.one(errorId).then((error: any) => {
                resolve(new Error().fromJSON(error))
            }).catch((error: any) => {
                toast.error('Failed to fetch error details.')
                reject(error)
            })
        })
    }
}

const sampleJsonFunnel = {
    // metricId: 1,
    name: "Funnel Sample",
    metricType: 'funnel',
    series: [
        {
            name: 'Series 1',
            filter: {
                eventsOrder: 'then',
                filters: [
                    { type: 'LOCATION', operator: 'is', value: ['/sessions', '/errors', '/users'], percent: 100, completed: 60, dropped: 40, },
                    { type: 'LOCATION', operator: 'is', value: ['/sessions'], percent: 80, completed: 40, dropped: 60, },
                    { type: 'CLICK', operator: 'on', value: ['DASHBOARDS'], percent: 80, completed: 10, dropped: 90, }
                ]
            }
        }
    ],
}

const sampleJsonErrors = {
    // metricId: 1,
    name: "Errors Sample",
    metricType: 'errors',
    metricFormat: 'sessionCount',
    series: [
        {
            name: 'Series 1',
            filter: {
                eventsOrder: 'then',
                filters: [
                    { type: 'LOCATION', operator: 'is', value: ['/sessions', '/errors', '/users'], percent: 100, completed: 60, dropped: 40, },
                    { type: 'LOCATION', operator: 'is', value: ['/sessions'], percent: 80, completed: 40, dropped: 60, },
                    { type: 'CLICK', operator: 'on', value: ['DASHBOARDS'], percent: 80, completed: 10, dropped: 90, }
                ]
            }
        }
    ],
}